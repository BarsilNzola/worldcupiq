import { ethers } from "ethers";

export const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

/**
 * See cctp/src/bridge.ts for the full explanation. Short version: this must be 7 params, not 4,
 * and we use Fast Transfer (minFinalityThreshold: 1000, maxFee: 500 = 0.0005 USDC — matching
 * Circle's own official quickstart exactly) rather than Standard Transfer, because Standard
 * Transfer's full-finality requirement can take well over 15 minutes on Sepolia testnet.
 */
export const TOKEN_MESSENGER_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) external returns (uint64 nonce)",
];

const TOKEN_MESSENGER_V1_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)",
];

const FAST_TRANSFER_MIN_FINALITY_THRESHOLD = 1000;
const FAST_TRANSFER_MAX_FEE = 500n; // 0.0005 USDC

export const MESSAGE_TRANSMITTER_ABI = [
  "event MessageSent(bytes message)",
  "function receiveMessage(bytes message, bytes attestation) external returns (bool success)",
];

export interface EvmChainConfig {
  name: string;
  chainIdHex: string;
  rpcUrls: string[];
  cctpDomain: number;
  usdcAddress: string;
  tokenMessengerAddress: string;
  messageTransmitterAddress: string;
}

/**
 * Public contract addresses and RPC endpoints — none of this is secret, so it's safe to embed
 * directly rather than route through env vars. These are the TESTNET addresses, sourced directly
 * from Circle's official contract-addresses reference (https://developers.circle.com/cctp/evm/contract-addresses),
 * identical across every testnet domain including Ethereum Sepolia, Base Sepolia, and Injective
 * Testnet. Do NOT reuse mainnet addresses here — Circle's testnet and mainnet deployments use
 * different addresses for the same contracts.
 */
const EVM_TOKEN_MESSENGER_V2_TESTNET = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
const EVM_MESSAGE_TRANSMITTER_V2_TESTNET = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";

export const SOURCE_CHAIN_CONFIGS: Record<string, EvmChainConfig> = {
  ethereum: {
    name: "Ethereum Sepolia",
    chainIdHex: "0xaa36a7", // 11155111
    rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
    cctpDomain: 0,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessengerAddress: EVM_TOKEN_MESSENGER_V2_TESTNET,
    messageTransmitterAddress: EVM_MESSAGE_TRANSMITTER_V2_TESTNET,
  },
  base: {
    name: "Base Sepolia",
    chainIdHex: "0x14a34", // 84532
    rpcUrls: ["https://sepolia.base.org"],
    cctpDomain: 6,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessengerAddress: EVM_TOKEN_MESSENGER_V2_TESTNET,
    messageTransmitterAddress: EVM_MESSAGE_TRANSMITTER_V2_TESTNET,
  },
};

export const INJECTIVE_DESTINATION = {
  chainIdHex: "0x59F", // 1439
  cctpDomain: 29,
  messageTransmitterAddress:
    process.env.NEXT_PUBLIC_INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS ?? EVM_MESSAGE_TRANSMITTER_V2_TESTNET,
};

function usdcToAtomicUnits(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = (fraction + "000000").slice(0, 6);
  return BigInt(whole || "0") * 1_000_000n + BigInt(paddedFraction || "0");
}

function addressToBytes32(address: string): string {
  return ethers.zeroPadValue(ethers.getAddress(address), 32);
}

async function switchToChain(chainIdHex: string, chainName: string, rpcUrls: string[]): Promise<void> {
  const ethereum = (window as any).ethereum;
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch (switchError: any) {
    if (switchError?.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: chainIdHex, chainName, rpcUrls }],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * MetaMask's injected provider doesn't always reflect a chain switch instantly, and a silently
 * failed switch wouldn't otherwise surface as an error — it would just quietly query whatever
 * network was already active. Since MessageTransmitterV2/TokenMessengerV2 are deployed at the
 * SAME address on every testnet domain, a wrong-network call looks like a normal contract call
 * that happens to revert, not an obvious "wrong network" error. This makes that failure mode loud
 * and explicit instead of ambiguous.
 */
async function assertConnectedToChain(provider: ethers.BrowserProvider, expectedChainIdHex: string, chainName: string) {
  const network = await provider.getNetwork();
  const expected = BigInt(expectedChainIdHex);
  if (network.chainId !== expected) {
    throw new Error(
      `Wallet is connected to chain ID ${network.chainId} but this step requires ${chainName} (chain ID ${expected}). ` +
        "The network switch may have silently failed or not finished — check your wallet's active network and try again."
    );
  }
}

export interface BurnResult {
  txHash: string;
  messageBytes: string;
}

/**
 * Step 1 — burn. Switches the connected wallet to the source chain, then has it directly sign
 * the USDC approval and the depositForBurn call. No private key ever leaves the wallet.
 */
export async function burnUsdcOnSourceChain(
  sourceChain: "ethereum" | "base",
  amountUsdc: string,
  recipientInjectiveAddress: string,
  onStatus?: (msg: string) => void
): Promise<BurnResult> {
  const chain = SOURCE_CHAIN_CONFIGS[sourceChain];
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error("No injected wallet found.");

  onStatus?.(`Switching wallet to ${chain.name}…`);
  await switchToChain(chain.chainIdHex, chain.name, chain.rpcUrls);

  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  const amount = usdcToAtomicUnits(amountUsdc);
  const mintRecipientBytes32 = addressToBytes32(recipientInjectiveAddress);

  const usdc = new ethers.Contract(chain.usdcAddress, USDC_ABI, signer);
  const signerAddress = await signer.getAddress();

  const balance: bigint = await usdc.balanceOf(signerAddress);
  if (balance < amount) {
    throw new Error(
      `Insufficient USDC balance on ${chain.name}: have ${ethers.formatUnits(balance, 6)}, need ${amountUsdc}. ` +
        "Get testnet USDC from faucet.circle.com first."
    );
  }

  const allowance: bigint = await usdc.allowance(signerAddress, chain.tokenMessengerAddress);
  if (allowance < amount) {
    onStatus?.("Approving USDC spend (confirm in wallet)…");
    const approveTx = await usdc.approve(chain.tokenMessengerAddress, amount);
    await approveTx.wait();
  }

  onStatus?.("Burning USDC on source chain (confirm in wallet)…");
  let receipt: ethers.TransactionReceipt;
  try {
    const tokenMessenger = new ethers.Contract(chain.tokenMessengerAddress, TOKEN_MESSENGER_ABI, signer);
    const burnTx = await tokenMessenger.depositForBurn(
      amount,
      INJECTIVE_DESTINATION.cctpDomain,
      mintRecipientBytes32,
      chain.usdcAddress,
      ethers.ZeroHash,
      FAST_TRANSFER_MAX_FEE,
      FAST_TRANSFER_MIN_FINALITY_THRESHOLD
    );
    receipt = await burnTx.wait();
  } catch (v2Error) {
    try {
      const tokenMessengerV1 = new ethers.Contract(chain.tokenMessengerAddress, TOKEN_MESSENGER_V1_ABI, signer);
      const burnTx = await tokenMessengerV1.depositForBurn(
        amount,
        INJECTIVE_DESTINATION.cctpDomain,
        mintRecipientBytes32,
        chain.usdcAddress
      );
      receipt = await burnTx.wait();
    } catch (v1Error) {
      throw new Error(
        `depositForBurn failed on both V2 (${(v2Error as Error).message}) and V1 (${(v1Error as Error).message}) signatures.`
      );
    }
  }

  const iface = new ethers.Interface(MESSAGE_TRANSMITTER_ABI);
  const messageSentTopic = iface.getEvent("MessageSent")!.topicHash;
  let messageBytes: string | undefined;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== chain.messageTransmitterAddress.toLowerCase()) continue;
    if (log.topics[0] !== messageSentTopic) continue;
    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (parsed?.name === "MessageSent") {
      messageBytes = parsed.args.message as string;
      break;
    }
  }

  if (!messageBytes) {
    throw new Error(
      `Burn succeeded (tx ${receipt.hash}) but no MessageSent event was found from ${chain.messageTransmitterAddress}. ` +
        "The messageTransmitterAddress for this chain may be wrong — verify it against a testnet explorer."
    );
  }

  return { txHash: receipt.hash, messageBytes };
}

/**
 * Step 2 — mint. Switches the wallet to Injective, then has it directly sign the
 * receiveMessage call with the message bytes + Circle attestation obtained from our backend's
 * (key-free) attestation-polling endpoint.
 */
export async function mintUsdcOnInjective(
  messageBytes: string,
  attestation: string,
  onStatus?: (msg: string) => void
): Promise<string> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error("No injected wallet found.");

  onStatus?.("Switching wallet to Injective…");
  await switchToChain(INJECTIVE_DESTINATION.chainIdHex, "Injective EVM Testnet", [
    process.env.NEXT_PUBLIC_INJECTIVE_EVM_RPC_URL ?? "",
  ]);

  const provider = new ethers.BrowserProvider(ethereum);
  const network = await provider.getNetwork();
  const expectedChainId = BigInt(parseInt(INJECTIVE_DESTINATION.chainIdHex, 16));

  if (network.chainId !== expectedChainId) {
    throw new Error(
      `Wallet is on chain ${network.chainId} but the mint requires Injective (chain ${expectedChainId}). ` +
        "The network switch may have silently failed — check MetaMask's active network manually before retrying."
    );
  }

  const signer = await provider.getSigner();
  const messageTransmitter = new ethers.Contract(
    INJECTIVE_DESTINATION.messageTransmitterAddress,
    MESSAGE_TRANSMITTER_ABI,
    signer
  );

  onStatus?.("Minting USDC on Injective (confirm in wallet)…");
  const mintTx = await messageTransmitter.receiveMessage(messageBytes, attestation);
  const receipt = await mintTx.wait();
  return receipt.hash;
}
