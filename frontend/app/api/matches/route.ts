import { NextResponse } from "next/server";
import type { Fixture } from "../../../lib/types";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.WORLDCUP_DATA_API_BASE_URL ?? "https://api.football-data.org/v4";
const API_KEY = process.env.WORLDCUP_DATA_API_KEY;
const COMPETITION_CODE = "WC";
const CACHE_TTL_MS = 30_000;

// Bundled fallback so the UI still shows something reasonable if no API key is configured or
// the provider is unreachable. This is a frozen snapshot (as of July 15, 2026) — NOT kept in
// sync automatically. The live path above is the real data source; this is just a safety net.
const FALLBACK_FIXTURES: Fixture[] = [
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

function mapStatus(status: string): Fixture["status"] {
  if (status === "FINISHED") return "finished";
  if (status === "IN_PLAY" || status === "PAUSED" || status === "LIVE") return "live";
  return "scheduled";
}

function mapStage(stage: string, group: string | null): string {
  switch (stage) {
    case "GROUP_STAGE":
      return group ? `Group ${group.replace("GROUP_", "")}` : "Group stage";
    case "LAST_16":
      return "Round of 16";
    case "QUARTER_FINALS":
      return "Quarter-final";
    case "SEMI_FINALS":
      return "Semi-final";
    case "THIRD_PLACE":
      return "Third-place playoff";
    case "FINAL":
      return "Final";
    default:
      return stage;
  }
}

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  venue?: string | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: { fullTime: { home: number | null; away: number | null } };
}

let cache: { fixtures: Fixture[]; expiresAt: number } | null = null;

async function getFixtures(): Promise<{ fixtures: Fixture[]; source: "live" | "fallback" }> {
  if (cache && cache.expiresAt > Date.now()) {
    return { fixtures: cache.fixtures, source: "live" };
  }

  if (!API_KEY) {
    console.warn("[api/matches] WORLDCUP_DATA_API_KEY not set — serving bundled fallback fixtures");
    return { fixtures: FALLBACK_FIXTURES, source: "fallback" };
  }

  try {
    const res = await fetch(`${BASE_URL}/competitions/${COMPETITION_CODE}/matches`, {
      headers: { "X-Auth-Token": API_KEY },
    });
    if (!res.ok) {
      throw new Error(`football-data.org request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { matches: FootballDataMatch[] };
    const fixtures: Fixture[] = data.matches.map((m) => ({
      matchId: String(m.id),
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      kickoffTimeUtc: m.utcDate,
      stage: mapStage(m.stage, m.group),
      venue: m.venue ?? "TBD",
      status: mapStatus(m.status),
      homeScore: m.score.fullTime.home ?? undefined,
      awayScore: m.score.fullTime.away ?? undefined,
    }));

    cache = { fixtures, expiresAt: Date.now() + CACHE_TTL_MS };
    return { fixtures, source: "live" };
  } catch (err) {
    console.warn(`[api/matches] Live fetch failed, serving bundled fallback: ${(err as Error).message}`);
    return { fixtures: FALLBACK_FIXTURES, source: "fallback" };
  }
}

export async function GET() {
  const { fixtures, source } = await getFixtures();
  return NextResponse.json({ fixtures, dataSource: source });
}
