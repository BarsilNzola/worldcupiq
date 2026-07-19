export interface BridgeRequest {
  sourceChain: "ethereum" | "base" | "solana";
  amountUsdc: string; // human-readable decimal string, e.g. "25.00"
  recipientInjectiveAddress: string;
  /** Set true when the caller is an autonomous agent doing a programmatic top-up. */
  isAgentInitiated?: boolean;
}

export type BridgeStepStatus = "pending" | "in_progress" | "complete" | "failed";

export interface BridgeStep {
  step: "burn" | "attest" | "mint";
  status: BridgeStepStatus;
  txHash?: string;
  detail?: string;
}

export interface BridgeResult {
  requestId: string;
  sourceChain: string;
  destinationChain: "injective";
  amountUsdc: string;
  steps: BridgeStep[];
  finalStatus: "complete" | "failed" | "pending";
  mintTxHash?: string;
}

export interface CircleAttestationResponse {
  status: "pending_confirmations" | "complete";
  attestation?: string;
  /**
   * Circle's own copy of the exact message bytes it attested to. Prefer this over any
   * message bytes derived independently (e.g. from parsing burn-tx event logs) — any subtle
   * mismatch there produces a signature that fails to verify against the real attester set,
   * surfacing as a confusing "not attester" revert even when the attesters are configured
   * correctly. This field is the authoritative source.
   */
  message?: string;
}
