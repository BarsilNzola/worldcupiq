import { ethers } from "ethers";
import { randomUUID } from "crypto";
import { CIRCLE_API_BASE_URL, INJECTIVE_DESTINATION, SUPPORTED_SOURCE_CHAINS } from "./config";
import type { BridgeRequest, BridgeResult, BridgeStep, CircleAttestationResponse } from "./types";

const USDC_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];

const TOKEN_MESSENGER_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)",
];

const MESSAGE_TRANSMITTER_ABI = [
  "event MessageSent(bytes message)",
  "function receiveMessage(bytes message, bytes attestation) external returns (bool success)",
];

function addressToBytes32(address: string): string {
  return ethers.zeroPadValue(ethers.getAddress(address), 32);
}

/**
 * CCTP's TokenMessenger.depositForBurn internally calls MessageTransmitter.sendMessage, which
 * emits `MessageSent(bytes message)`. That raw message blob — not the burn tx hash, not the
 * attestation alone — is what the destination chain's `receiveMessage` needs alongside Circle's
 * attestation signature. This decodes it straight out of the burn transaction's logs.
 */
function extractMessageBytesFromReceipt(
  receipt: ethers.TransactionReceipt,
  messageTransmitterAddress: string
): string {
  const iface = new ethers.Interface(MESSAGE_TRANSMITTER_ABI);
  const messageSentTopic = iface.getEvent("MessageSent")!.topicHash;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== messageTransmitterAddress.toLowerCase()) continue;
    if (log.topics[0] !== messageSentTopic) continue;

    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (parsed?.name === "MessageSent") {
      return parsed.args.message as string;
    }
  }

  throw new Error(
    `MessageSent event not found in burn tx ${receipt.hash} logs (looked for emitter ${messageTransmitterAddress}). ` +
      "Check that messageTransmitterAddress in config.ts matches the source chain's actual CCTP contract."
  );
}

function usdcToAtomicUnits(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = (fraction + "000000").slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(paddedFraction || "0");
}

async function pollForAttestation(txHash: string, sourceDomain: number): Promise<string> {
  const url = `${CIRCLE_API_BASE_URL}/v2/messages/${sourceDomain}?transactionHash=${txHash}`;

  const maxAttempts = 30;
  const delayMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as { messages?: CircleAttestationResponse[] };
      const message = data.messages?.[0];
      if (message?.status === "complete" && message.attestation) {
        return message.attestation;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Attestation polling timed out — Circle's Iris API did not finalize in time");
}

/**
 * Executes a full CCTP V2 burn-and-mint bridge from a supported EVM source chain to Injective.
 *
 * Flow:
 *   1. burn:   caller's USDC is burned on the source chain via TokenMessenger.depositForBurn
 *   2. attest: Circle's off-chain attestation service (Iris) signs a message once the burn is
 *              observed and finalized on the source chain
 *   3. mint:   the signed message + attestation are submitted to Injective's MessageTransmitter,
 *              which mints the equivalent USDC to the recipient
 *
 * Note: Solana source chains use SPL-token instructions rather than this EVM ABI path; wire up
 * @solana/web3.js there following the same three-step shape.
 */
export async function bridgeUsdcToInjective(
  request: BridgeRequest,
  signerPrivateKey: string
): Promise<BridgeResult> {
  const requestId = randomUUID();
  const steps: BridgeStep[] = [
    { step: "burn", status: "pending" },
    { step: "attest", status: "pending" },
    { step: "mint", status: "pending" },
  ];

  if (request.sourceChain === "solana") {
    throw new Error(
      "Solana source bridging requires the @solana/web3.js SPL-token burn path — not implemented in this EVM-only sample."
    );
  }

  const chain = SUPPORTED_SOURCE_CHAINS[request.sourceChain];
  const rpcUrl = process.env[chain.rpcUrlEnvVar];
  if (!rpcUrl) {
    throw new Error(`Missing RPC URL env var ${chain.rpcUrlEnvVar} for ${chain.name}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(signerPrivateKey, provider);

  const amount = usdcToAtomicUnits(request.amountUsdc);
  const mintRecipientBytes32 = addressToBytes32(request.recipientInjectiveAddress);

  // ── Step 1: burn ───────────────────────────────────────────────────────────
  steps[0].status = "in_progress";
  const usdc = new ethers.Contract(chain.usdcAddress, USDC_ABI, signer);
  const tokenMessenger = new ethers.Contract(chain.tokenMessengerAddress, TOKEN_MESSENGER_ABI, signer);

  await (await usdc.approve(chain.tokenMessengerAddress, amount)).wait();

  const burnTx = await tokenMessenger.depositForBurn(
    amount,
    INJECTIVE_DESTINATION.cctpDomain,
    mintRecipientBytes32,
    chain.usdcAddress
  );
  const burnReceipt = await burnTx.wait();

  let messageBytes: string;
  try {
    messageBytes = extractMessageBytesFromReceipt(burnReceipt, chain.messageTransmitterAddress);
  } catch (err) {
    steps[0] = { step: "burn", status: "failed", txHash: burnReceipt.hash, detail: (err as Error).message };
    return { requestId, sourceChain: chain.name, destinationChain: "injective", amountUsdc: request.amountUsdc, steps, finalStatus: "failed" };
  }

  steps[0] = { step: "burn", status: "complete", txHash: burnReceipt.hash };

  // ── Step 2: attest ─────────────────────────────────────────────────────────
  steps[1].status = "in_progress";
  let attestation: string;
  try {
    attestation = await pollForAttestation(burnReceipt.hash, chain.cctpDomain);
    steps[1] = { step: "attest", status: "complete" };
  } catch (err) {
    steps[1] = { step: "attest", status: "failed", detail: (err as Error).message };
    return { requestId, sourceChain: chain.name, destinationChain: "injective", amountUsdc: request.amountUsdc, steps, finalStatus: "failed" };
  }

  // ── Step 3: mint on Injective ──────────────────────────────────────────────
  steps[2].status = "in_progress";
  const injectiveRpcUrl = process.env.INJECTIVE_EVM_RPC_URL;
  if (!injectiveRpcUrl) {
    throw new Error("Missing INJECTIVE_EVM_RPC_URL");
  }
  const injectiveProvider = new ethers.JsonRpcProvider(injectiveRpcUrl);
  const injectiveSigner = new ethers.Wallet(signerPrivateKey, injectiveProvider);

  // In production, use a MessageTransmitter address deployed on Injective's inEVM — this must
  // be the real, current contract address from Injective/Circle's deployment docs, not a guess.
  const messageTransmitterAddress = process.env.INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS ?? "";
  if (!messageTransmitterAddress) {
    steps[2] = { step: "mint", status: "failed", detail: "Missing INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS" };
    return { requestId, sourceChain: chain.name, destinationChain: "injective", amountUsdc: request.amountUsdc, steps, finalStatus: "failed" };
  }
  const messageTransmitter = new ethers.Contract(messageTransmitterAddress, MESSAGE_TRANSMITTER_ABI, injectiveSigner);

  try {
    const mintTx = await messageTransmitter.receiveMessage(messageBytes, attestation);
    const mintReceipt = await mintTx.wait();
    steps[2] = { step: "mint", status: "complete", txHash: mintReceipt.hash };

    return {
      requestId,
      sourceChain: chain.name,
      destinationChain: "injective",
      amountUsdc: request.amountUsdc,
      steps,
      finalStatus: "complete",
      mintTxHash: mintReceipt.hash,
    };
  } catch (err) {
    steps[2] = { step: "mint", status: "failed", detail: (err as Error).message };
    return { requestId, sourceChain: chain.name, destinationChain: "injective", amountUsdc: request.amountUsdc, steps, finalStatus: "failed" };
  }
}
