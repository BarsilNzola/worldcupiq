import type { Fixture, LeaderboardEntry, StandingsRow } from "./types";

// FALLBACK DATA — used only when the live football-data.org API is unreachable or
// WORLDCUP_DATA_API_KEY isn't set. See dataSource.ts for the real data source; this snapshot is
// frozen as of July 15, 2026 and will go stale on its own the moment results move on.
export const FIXTURES: Fixture[] = [
  {
    matchId: "esp-bel-qf",
    homeTeam: "Spain",
    awayTeam: "Belgium",
    kickoffTimeUtc: "2026-07-10T19:00:00Z",
    stage: "Quarter-final",
    venue: "TBD",
    status: "finished",
    homeScore: 2,
    awayScore: 1,
  },
  {
    matchId: "arg-sui-qf",
    homeTeam: "Argentina",
    awayTeam: "Switzerland",
    kickoffTimeUtc: "2026-07-12T01:00:00Z",
    stage: "Quarter-final",
    venue: "TBD",
    status: "finished",
    homeScore: 3,
    awayScore: 1,
  },
  {
    matchId: "fra-esp-sf1",
    homeTeam: "France",
    awayTeam: "Spain",
    kickoffTimeUtc: "2026-07-14T19:00:00Z",
    stage: "Semi-final",
    venue: "TBD",
    status: "finished",
    homeScore: 0,
    awayScore: 2,
  },
  {
    matchId: "eng-arg-sf2",
    homeTeam: "England",
    awayTeam: "Argentina",
    kickoffTimeUtc: "2026-07-15T19:00:00Z",
    stage: "Semi-final",
    venue: "TBD",
    status: "scheduled",
  },
  {
    matchId: "3rd-place-playoff",
    homeTeam: "France",
    awayTeam: "Loser of ENG/ARG",
    kickoffTimeUtc: "2026-07-18T21:00:00Z",
    stage: "Third-place playoff",
    venue: "TBD",
    status: "scheduled",
  },
  {
    matchId: "final-2026",
    homeTeam: "Spain",
    awayTeam: "Winner of ENG/ARG",
    kickoffTimeUtc: "2026-07-19T19:00:00Z",
    stage: "Final",
    venue: "TBD",
    status: "scheduled",
  },
];

// Final group-stage standings, FIFA World Cup 2026 (12 groups of 4). goalDifference isn't
// available from the underlying data source, so it's omitted rather than fabricated.
export const STANDINGS: StandingsRow[] = [
  { team: "Mexico", group: "A", played: 3, won: 3, drawn: 0, lost: 0, points: 9 },
  { team: "South Africa", group: "A", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Korea Republic", group: "A", played: 3, won: 1, drawn: 0, lost: 2, points: 3 },
  { team: "Czechia", group: "A", played: 3, won: 0, drawn: 1, lost: 2, points: 1 },

  { team: "Switzerland", group: "B", played: 3, won: 2, drawn: 1, lost: 0, points: 7 },
  { team: "Canada", group: "B", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Bosnia and Herzegovina", group: "B", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Qatar", group: "B", played: 3, won: 0, drawn: 1, lost: 2, points: 1 },

  { team: "Brazil", group: "C", played: 3, won: 2, drawn: 1, lost: 0, points: 7 },
  { team: "Morocco", group: "C", played: 3, won: 2, drawn: 1, lost: 0, points: 7 },
  { team: "Scotland", group: "C", played: 3, won: 1, drawn: 0, lost: 2, points: 3 },
  { team: "Haiti", group: "C", played: 3, won: 0, drawn: 0, lost: 3, points: 0 },

  { team: "USA", group: "D", played: 3, won: 2, drawn: 0, lost: 1, points: 6 },
  { team: "Australia", group: "D", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Paraguay", group: "D", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Turkiye", group: "D", played: 3, won: 1, drawn: 0, lost: 2, points: 3 },

  { team: "Germany", group: "E", played: 3, won: 2, drawn: 0, lost: 1, points: 6 },
  { team: "Ivory Coast", group: "E", played: 3, won: 2, drawn: 0, lost: 1, points: 6 },
  { team: "Ecuador", group: "E", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Curacao", group: "E", played: 3, won: 0, drawn: 1, lost: 2, points: 1 },

  { team: "Netherlands", group: "F", played: 3, won: 2, drawn: 1, lost: 0, points: 7 },
  { team: "Japan", group: "F", played: 3, won: 1, drawn: 2, lost: 0, points: 5 },
  { team: "Sweden", group: "F", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Tunisia", group: "F", played: 3, won: 0, drawn: 0, lost: 3, points: 0 },

  { team: "Belgium", group: "G", played: 3, won: 1, drawn: 2, lost: 0, points: 5 },
  { team: "Egypt", group: "G", played: 3, won: 1, drawn: 2, lost: 0, points: 5 },
  { team: "IR Iran", group: "G", played: 3, won: 0, drawn: 3, lost: 0, points: 3 },
  { team: "New Zealand", group: "G", played: 3, won: 0, drawn: 1, lost: 2, points: 1 },

  { team: "Spain", group: "H", played: 3, won: 2, drawn: 1, lost: 0, points: 7 },
  { team: "Cape Verde", group: "H", played: 3, won: 0, drawn: 3, lost: 0, points: 3 },
  { team: "Uruguay", group: "H", played: 3, won: 0, drawn: 2, lost: 1, points: 2 },
  { team: "Saudi Arabia", group: "H", played: 3, won: 0, drawn: 2, lost: 1, points: 2 },

  { team: "France", group: "I", played: 3, won: 3, drawn: 0, lost: 0, points: 9 },
  { team: "Norway", group: "I", played: 3, won: 2, drawn: 0, lost: 1, points: 6 },
  { team: "Senegal", group: "I", played: 3, won: 1, drawn: 0, lost: 2, points: 3 },
  { team: "Iraq", group: "I", played: 3, won: 0, drawn: 0, lost: 3, points: 0 },

  { team: "Argentina", group: "J", played: 3, won: 3, drawn: 0, lost: 0, points: 9 },
  { team: "Austria", group: "J", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Algeria", group: "J", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Jordan", group: "J", played: 3, won: 0, drawn: 0, lost: 3, points: 0 },

  { team: "Colombia", group: "K", played: 3, won: 2, drawn: 1, lost: 0, points: 7 },
  { team: "Portugal", group: "K", played: 3, won: 1, drawn: 2, lost: 0, points: 5 },
  { team: "Congo DR", group: "K", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Uzbekistan", group: "K", played: 3, won: 0, drawn: 0, lost: 3, points: 0 },

  { team: "England", group: "L", played: 3, won: 2, drawn: 1, lost: 0, points: 7 },
  { team: "Croatia", group: "L", played: 3, won: 2, drawn: 0, lost: 1, points: 6 },
  { team: "Ghana", group: "L", played: 3, won: 1, drawn: 1, lost: 1, points: 4 },
  { team: "Panama", group: "L", played: 3, won: 0, drawn: 0, lost: 3, points: 0 },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, address: "0xA1c3...9F2b", displayName: "PitchOracle-Agent", points: 480, isAgent: true },
  { rank: 2, address: "0x77Bd...11aC", displayName: "futbol_fan_23", points: 460, isAgent: false },
  { rank: 3, address: "0x9De2...44e0", displayName: "ValueBettorBot", points: 440, isAgent: true },
  { rank: 4, address: "0x1FaC...c02D", displayName: "seleccion_super", points: 410, isAgent: false },
  { rank: 5, address: "0x3E90...7A1f", displayName: "TacticsGPT", points: 395, isAgent: true },
];
