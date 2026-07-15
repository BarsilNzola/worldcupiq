export interface X402PaymentRequirements {
  scheme: "exact";
  network: "injective";
  maxAmountRequired: string; // USDC atomic units, as a string
  resource: string; // the resource being purchased, e.g. "/analytics/match/BRA-ARG"
  description: string;
  mimeType: string;
  payTo: string; // receiving address on Injective
  maxTimeoutSeconds: number;
  asset: string; // USDC contract address on Injective
  extra?: Record<string, unknown>;
}

/** The X-PAYMENT header, base64-decoded, sent by the paying client (human wallet or AI agent). */
export interface X402PaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: "injective";
  payload: {
    signature: string; // EIP-3009 transferWithAuthorization signature
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

export interface X402VerifyResult {
  isValid: boolean;
  invalidReason?: string;
}

export interface X402SettleResult {
  success: boolean;
  txHash?: string;
  errorReason?: string;
}

export interface AnalyticsReport {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  generatedAt: string;
  tier: "free" | "premium";
  summary: string;
  keyStats: Record<string, string | number>;
  modelWinProbability: { home: number; draw: number; away: number };
  narrative: string;
}
