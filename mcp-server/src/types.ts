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
}

export interface StandingsRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
}

export interface BracketNode {
  round: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  winner?: string;
}

export interface MarketSentiment {
  matchId: string;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  totalPredictions: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName: string;
  points: number;
  isAgent: boolean;
}
