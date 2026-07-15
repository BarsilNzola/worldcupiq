import { NextResponse } from "next/server";
import type { Fixture } from "../../../lib/types";

// Mirrors mcp-server/src/mockData.ts so the frontend has something to render even before the
// backend services are wired up to a live World Cup data provider.
const FIXTURES: Fixture[] = [
  {
    matchId: "bra-arg-final",
    homeTeam: "Brazil",
    awayTeam: "Argentina",
    kickoffTimeUtc: "2026-07-19T15:00:00Z",
    stage: "Final",
    venue: "MetLife Stadium",
    status: "scheduled",
    modelConfidence: 0.58,
    marketOdds: { home: 0.42, draw: 0.26, away: 0.32 },
  },
  {
    matchId: "fra-eng-sf1",
    homeTeam: "France",
    awayTeam: "England",
    kickoffTimeUtc: "2026-07-14T19:00:00Z",
    stage: "Semi-final",
    venue: "AT&T Stadium",
    status: "scheduled",
    modelConfidence: 0.51,
    marketOdds: { home: 0.38, draw: 0.27, away: 0.35 },
  },
  {
    matchId: "esp-ger-sf2",
    homeTeam: "Spain",
    awayTeam: "Germany",
    kickoffTimeUtc: "2026-07-15T19:00:00Z",
    stage: "Semi-final",
    venue: "SoFi Stadium",
    status: "scheduled",
    modelConfidence: 0.55,
    marketOdds: { home: 0.4, draw: 0.24, away: 0.36 },
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

export async function GET() {
  return NextResponse.json({ fixtures: FIXTURES });
}
