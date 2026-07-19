export type Outcome = "HOME_WIN" | "AWAY_WIN" | "DRAW";

export interface MatchEvaluation {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTimeUtc: string;
  marketImpliedProbability: { home: number; draw: number; away: number };
  modelProbability?: { home: number; draw: number; away: number };
  edge?: number; // model probability minus market implied probability, for the recommended side
  recommendedPick: Outcome;
  confidence: number; // 0-1
  usedPremiumReport: boolean;
  rationale: string;
}

export interface AnalystConfig {
  /** Minimum edge (model probability - market probability) required to justify paying for a premium report. */
  minEdgeToPurchase: number;
  /** Minimum confidence required to actually submit an on-chain prediction. */
  minConfidenceToSubmit: number;
  /** Max USDC willing to spend per match on premium reports. */
  maxSpendPerMatchUsdc: number;
}

export const DEFAULT_ANALYST_CONFIG: AnalystConfig = {
  minEdgeToPurchase: 0.05,
  minConfidenceToSubmit: 0.55,
  maxSpendPerMatchUsdc: 0.01,
};
