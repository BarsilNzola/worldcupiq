import type { BracketNode, Fixture, LeaderboardEntry, MarketSentiment, StandingsRow } from "./types";

export const FIXTURES: Fixture[] = [
  {
    matchId: "bra-arg-final",
    homeTeam: "Brazil",
    awayTeam: "Argentina",
    kickoffTimeUtc: "2026-07-19T15:00:00Z",
    stage: "Final",
    venue: "MetLife Stadium",
    status: "scheduled",
  },
  {
    matchId: "fra-eng-sf1",
    homeTeam: "France",
    awayTeam: "England",
    kickoffTimeUtc: "2026-07-14T19:00:00Z",
    stage: "Semi-final",
    venue: "AT&T Stadium",
    status: "scheduled",
  },
  {
    matchId: "esp-ger-sf2",
    homeTeam: "Spain",
    awayTeam: "Germany",
    kickoffTimeUtc: "2026-07-15T19:00:00Z",
    stage: "Semi-final",
    venue: "SoFi Stadium",
    status: "scheduled",
  },
  {
    matchId: "por-ned-qf1",
    homeTeam: "Portugal",
    awayTeam: "Netherlands",
    kickoffTimeUtc: "2026-07-10T18:00:00Z",
    stage: "Quarter-final",
    venue: "Estadio Azteca",
    status: "finished",
    homeScore: 2,
    awayScore: 1,
  },
];

export const STANDINGS: StandingsRow[] = [
  { team: "Brazil", played: 4, won: 3, drawn: 1, lost: 0, goalDifference: 6, points: 10 },
  { team: "Argentina", played: 4, won: 3, drawn: 0, lost: 1, goalDifference: 4, points: 9 },
  { team: "France", played: 4, won: 2, drawn: 2, lost: 0, goalDifference: 5, points: 8 },
  { team: "England", played: 4, won: 2, drawn: 1, lost: 1, goalDifference: 3, points: 7 },
  { team: "Spain", played: 4, won: 2, drawn: 1, lost: 1, goalDifference: 2, points: 7 },
  { team: "Germany", played: 4, won: 2, drawn: 0, lost: 2, goalDifference: 1, points: 6 },
];

export const BRACKET: BracketNode[] = [
  { round: "Quarter-final", matchId: "por-ned-qf1", homeTeam: "Portugal", awayTeam: "Netherlands", winner: "Portugal" },
  { round: "Semi-final", matchId: "fra-eng-sf1", homeTeam: "France", awayTeam: "England" },
  { round: "Semi-final", matchId: "esp-ger-sf2", homeTeam: "Spain", awayTeam: "Germany" },
  { round: "Final", matchId: "bra-arg-final", homeTeam: "Brazil", awayTeam: "Argentina" },
];

export const MARKET_SENTIMENT: Record<string, MarketSentiment> = {
  "bra-arg-final": { matchId: "bra-arg-final", homeWinPct: 42, drawPct: 26, awayWinPct: 32, totalPredictions: 18420 },
  "fra-eng-sf1": { matchId: "fra-eng-sf1", homeWinPct: 38, drawPct: 27, awayWinPct: 35, totalPredictions: 9130 },
  "esp-ger-sf2": { matchId: "esp-ger-sf2", homeWinPct: 40, drawPct: 24, awayWinPct: 36, totalPredictions: 8760 },
};

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, address: "0xA1c3...9F2b", displayName: "PitchOracle-Agent", points: 480, isAgent: true },
  { rank: 2, address: "0x77Bd...11aC", displayName: "futbol_fan_23", points: 460, isAgent: false },
  { rank: 3, address: "0x9De2...44e0", displayName: "ValueBettorBot", points: 440, isAgent: true },
  { rank: 4, address: "0x1FaC...c02D", displayName: "seleccion_super", points: 410, isAgent: false },
  { rank: 5, address: "0x3E90...7A1f", displayName: "TacticsGPT", points: 395, isAgent: true },
];
