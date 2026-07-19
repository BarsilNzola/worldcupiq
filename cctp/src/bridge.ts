import { ethers } from "ethers";
import { randomUUID } from "crypto";
import { getCircleApiBaseUrl, getInjectiveDestination, SUPPORTED_SOURCE_CHAINS } from "./config";
import type { BridgeRequest, BridgeResult, BridgeStep, CircleAttestationResponse } from "./types";

export const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

/**
 * CCTP V2's depositForBurn takes SEVEN parameters, not four — this is the single biggest bug
 * that was silently breaking every bridge attempt before this fix. The extra params:
 *   - maxFee: the max fee (in burn-token units) the caller will pay. We use Fast Transfer here
 *     (see minFinalityThreshold below), which needs a small non-zero fee — 500 units (0.0005
 *     USDC) matches Circle's own official quickstart example exactly, hardcoded rather than
 *     fetched live since it's negligible and Circle's own example does the same.
 *   - destinationCaller: bytes32(0) means anyone can submit the mint on the destination chain.
 *   - minFinalityThreshold: 1000 = Fast Transfer (soft finality, attests in under a minute).
 *     2000+ = Standard Transfer (full finality — can take well over 15 minutes on Sepolia,
 *     which is what caused attestation polling to time out before this fix).
 */
export const TOKEN_MESSENGER_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) external returns (uint64 nonce)",
];

// Kept only as a fallback for any deployment that turns out to still be CCTP V1.
const TOKEN_MESSENGER_V1_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)",
];

export const MESSAGE_TRANSMITTER_ABI = [
  "event MessageSent(bytes message)",
  "function receiveMessage(bytes message, bytes attestation) external returns (bool success)",
];

const FAST_TRANSFER_MIN_FINALITY_THRESHOLD = 1000;
const FAST_TRANSFER_MAX_FEE = 500n; // 0.0005 USDC — matches Circle's own quickstart example

function addressToBytes32(address: string): string {
  return ethers.zeroPadValue(ethers.getAddress(address), 32);
}

function usdcToAtomicUnits(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = (fraction + "000000").slice(0, 6);
  return BigInt(whole || "0") * 1_000_000n + BigInt(paddedFraction || "0");
}

/**
 * CCTP's TokenMessenger.depositForBurn internally calls MessageTransmitter.sendMessage, which
 * emits `MessageSent(bytes message)`. That raw message blob — not the burn tx hash, not the
 * attestation alone — is what the destination chain's `receiveMessage` needs alongside Circle's
 * attestation signature. This decodes it straight out of the burn transaction's logs.
 */
export function extractMessageBytesFromReceipt(
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

export interface AttestationResult {
  attestation: string;
  message: string;
}

/**
 * Polls Circle's Iris API for the attestation matching a burn transaction. Returns BOTH the
 * attestation and Circle's own copy of the message bytes — the message field is what we should
 * pass to receiveMessage, not any independently-derived version (e.g. parsed from event logs),
 * since even a one-byte mismatch there causes signature verification to fail against the real
 * attester set with a misleadingly generic "not attester" revert.
 */
export async function pollForAttestation(txHash: string, sourceDomain: number): Promise<AttestationResult> {
  const url = `${getCircleApiBaseUrl()}/v2/messages/${sourceDomain}?transactionHash=${txHash}`;
  const apiKey = process.env.CIRCLE_API_KEY;

  const maxAttempts = 30;
  const delayMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined });
    } catch (err) {
      console.warn(`[cctp] Attestation poll attempt ${attempt + 1} network error: ${(err as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    if (res.ok) {
      const data = (await res.json()) as { messages?: CircleAttestationResponse[] };
      const entry = data.messages?.[0];
      if (entry?.status === "complete" && entry.attestation && entry.message) {
        return { attestation: entry.attestation, message: entry.message };
      }
    } else if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Circle API rejected the request (${res.status}) — check CIRCLE_API_KEY is set correctly in .env`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Attestation polling timed out — Circle's Iris API did not finalize in time");
}

/**
 * Executes a full CCTP V2 burn-and-mint bridge from a supported EVM source chain to Injective,
 * signed server-side with a raw private key. This path is intended for non-browser callers
 * (e.g. an autonomous agent's own automated top-ups) — browser users should prefer the
 * wallet-signed flow in frontend/lib/cctp.ts instead, which never touches a private key.
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

  const fail = (step: "burn" | "attest" | "mint", detail: string, txHash?: string): BridgeResult => {
    const idx = steps.findIndex((s) => s.step === step);
    steps[idx] = { step, status: "failed", txHash, detail };
    return {
      requestId,
      sourceChain: request.sourceChain,
      destinationChain: "injective",
      amountUsdc: request.amountUsdc,
      steps,
      finalStatus: "failed",
    };
  };

  if (request.sourceChain === "solana") {
    return fail("burn", "Solana source bridging requires the @solana/web3.js SPL-token path — not implemented here.");
  }

  const chain = SUPPORTED_SOURCE_CHAINS[request.sourceChain];
  if (!chain) {
    return fail("burn", `Unsupported source chain: ${request.sourceChain}`);
  }

  const rpcUrl = process.env[chain.rpcUrlEnvVar];
  if (!rpcUrl) {
    return fail("burn", `Missing RPC URL env var ${chain.rpcUrlEnvVar} for ${chain.name}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(signerPrivateKey, provider);

  const amount = usdcToAtomicUnits(request.amountUsdc);
  const mintRecipientBytes32 = addressToBytes32(request.recipientInjectiveAddress);

  // ── Step 1: burn ───────────────────────────────────────────────────────────
  steps[0].status = "in_progress";
  const usdc = new ethers.Contract(chain.usdcAddress, USDC_ABI, signer);

  const signerAddress = await signer.getAddress();
  const balance: bigint = await usdc.balanceOf(signerAddress);
  if (balance < amount) {
    return fail(
      "burn",
      `Insufficient USDC balance on ${chain.name}: have ${ethers.formatUnits(balance, 6)}, need ${request.amountUsdc}`
    );
  }

  const allowance: bigint = await usdc.allowance(signerAddress, chain.tokenMessengerAddress);
  if (allowance < amount) {
    await (await usdc.approve(chain.tokenMessengerAddress, amount)).wait();
  }

  let burnReceipt: ethers.TransactionReceipt;
  try {
    const tokenMessenger = new ethers.Contract(chain.tokenMessengerAddress, TOKEN_MESSENGER_ABI, signer);
    const burnTx = await tokenMessenger.depositForBurn(
      amount,
      getInjectiveDestination().cctpDomain,
      mintRecipientBytes32,
      chain.usdcAddress,
      ethers.ZeroHash, // destinationCaller: anyone may relay the mint
      FAST_TRANSFER_MAX_FEE,
      FAST_TRANSFER_MIN_FINALITY_THRESHOLD
    );
    burnReceipt = await burnTx.wait();
  } catch (v2Error) {
    // Fall back to the V1 4-param signature in case this deployment turns out not to be V2.
    try {
      const tokenMessengerV1 = new ethers.Contract(chain.tokenMessengerAddress, TOKEN_MESSENGER_V1_ABI, signer);
      const burnTx = await tokenMessengerV1.depositForBurn(
        amount,
        getInjectiveDestination().cctpDomain,
        mintRecipientBytes32,
        chain.usdcAddress
      );
      burnReceipt = await burnTx.wait();
    } catch (v1Error) {
      return fail(
        "burn",
        `depositForBurn failed on both V2 (${(v2Error as Error).message}) and V1 (${(v1Error as Error).message}) signatures. ` +
          `The TokenMessenger address (${chain.tokenMessengerAddress}) may not be correct for ${chain.name} — verify on a testnet explorer.`
      );
    }
  }

  // We still extract our own copy purely as a diagnostic cross-check (logged, not used for the
  // actual mint) — if it ever differs from Circle's returned message below, that's a real bug
  // worth knowing about, but Circle's copy is what we submit on-chain.
  try {
    const ownExtraction = extractMessageBytesFromReceipt(burnReceipt, chain.messageTransmitterAddress);
    console.log(`[cctp] Own event-log message extraction succeeded (${ownExtraction.length} chars)`);
  } catch (err) {
    console.warn(`[cctp] Own event-log message extraction failed (non-fatal, using Circle's copy instead): ${(err as Error).message}`);
  }

  steps[0] = { step: "burn", status: "complete", txHash: burnReceipt.hash };

  // ── Step 2: attest ─────────────────────────────────────────────────────────
  steps[1].status = "in_progress";
  let attestation: string;
  let messageBytes: string;
  try {
    const result = await pollForAttestation(burnReceipt.hash, chain.cctpDomain);
    attestation = result.attestation;
    messageBytes = result.message;
    steps[1] = { step: "attest", status: "complete" };
  } catch (err) {
    return fail("attest", (err as Error).message);
  }

  // ── Step 3: mint on Injective ──────────────────────────────────────────────
  steps[2].status = "in_progress";
  const injectiveRpcUrl = process.env.INJECTIVE_EVM_RPC_URL;
  if (!injectiveRpcUrl) {
    return fail("mint", "Missing INJECTIVE_EVM_RPC_URL");
  }

  const messageTransmitterAddress = process.env.INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS ?? "";
  if (!messageTransmitterAddress) {
    return fail("mint", "Missing INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS");
  }

  const injectiveProvider = new ethers.JsonRpcProvider(injectiveRpcUrl);
  const injectiveSigner = new ethers.Wallet(signerPrivateKey, injectiveProvider);

  const injBalance = await injectiveProvider.getBalance(await injectiveSigner.getAddress());
  if (injBalance === 0n) {
    return fail("mint", "Signer wallet has no INJ on Injective testnet to pay gas for the mint tx — fund it first.");
  }

  try {
    const messageTransmitter = new ethers.Contract(messageTransmitterAddress, MESSAGE_TRANSMITTER_ABI, injectiveSigner);
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
    return fail("mint", (err as Error).message);
  }
}
