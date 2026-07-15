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
}
