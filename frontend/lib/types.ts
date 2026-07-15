export interface Fixture {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTimeUtc: string;
  stage: string;
  venue: string;
  status: "scheduled" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
  modelConfidence?: number; // 0-1, AI confidence in the favored side
  marketOdds?: { home: number; draw: number; away: number }; // implied probability, 0-1
}

export interface AnalyticsReport {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  generatedAt: string;
  tier: "free" | "premium";
  summary: string;
  keyStats: Record<string, string | number>;
  modelWinProbability?: { home: number; draw: number; away: number };
  narrative: string;
  paymentTxHash?: string;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName: string;
  points: number;
  isAgent: boolean;
}

export type Outcome = "HOME_WIN" | "AWAY_WIN" | "DRAW";

export interface BridgeStep {
  step: "burn" | "attest" | "mint";
  status: "pending" | "in_progress" | "complete" | "failed";
  txHash?: string;
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
