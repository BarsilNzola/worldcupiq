import { FIXTURES as FALLBACK_FIXTURES, STANDINGS as FALLBACK_STANDINGS } from "./mockData";
import type { Fixture, StandingsRow } from "./types";

/**
 * Live fixture/standings data from football-data.org's FIFA World Cup competition (code "WC").
 * Free-tier API keys work fine here — sign up at https://www.football-data.org/client/register.
 *
 * Falls back to the bundled snapshot in mockData.ts when no API key is configured, the request
 * fails, or the provider rate-limits us, so the platform still runs (with slightly stale data)
 * rather than breaking outright.
 */
const COMPETITION_CODE = "WC";
const CACHE_TTL_MS = 30_000;

const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  const data = await fn();
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

async function fetchFromApi<T>(path: string): Promise<T> {
  // Read env vars lazily, at call time — not as a module-level const. Under esbuild-based
  // runners (tsx), import declarations are hoisted per ES module semantics, so a top-level
  // `const API_KEY = process.env.X` in an imported file can execute before this file's own
  // dotenv.config() call ever runs, silently freezing in `undefined` forever. Reading inside a
  // function guarantees this runs long after the app has started and .env is truly loaded.
  const baseUrl = process.env.WORLDCUP_DATA_API_BASE_URL ?? "https://api.football-data.org/v4";
  const apiKey = process.env.WORLDCUP_DATA_API_KEY;

  if (!apiKey) {
    throw new Error("WORLDCUP_DATA_API_KEY not configured");
  }
  const res = await fetch(`${baseUrl}${path}`, { headers: { "X-Auth-Token": apiKey } });
  if (!res.ok) {
    throw new Error(`football-data.org request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

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

export async function getLiveFixtures(): Promise<{ fixtures: Fixture[]; source: "live" | "fallback" }> {
  try {
    return await withCache("fixtures", async () => {
      const data = await fetchFromApi<{ matches: FootballDataMatch[] }>(
        `/competitions/${COMPETITION_CODE}/matches`
      );
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
      return { fixtures, source: "live" as const };
    });
  } catch (err) {
    console.warn(`[dataSource] Falling back to bundled fixture snapshot: ${(err as Error).message}`);
    return { fixtures: FALLBACK_FIXTURES, source: "fallback" };
  }
}

export async function getFixtureById(matchId: string): Promise<Fixture | undefined> {
  const { fixtures } = await getLiveFixtures();
  return fixtures.find((f) => f.matchId === matchId);
}

interface FootballDataStandingsRow {
  team: { name: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalDifference: number;
}

interface FootballDataStandingsGroup {
  group: string | null;
  type: string;
  table: FootballDataStandingsRow[];
}

export async function getLiveStandings(): Promise<{ standings: StandingsRow[]; source: "live" | "fallback" }> {
  try {
    return await withCache("standings", async () => {
      const data = await fetchFromApi<{ standings: FootballDataStandingsGroup[] }>(
        `/competitions/${COMPETITION_CODE}/standings`
      );
      const standings: StandingsRow[] = data.standings
        .filter((g) => g.type === "TOTAL")
        .flatMap((g) =>
          g.table.map((row) => ({
            team: row.team.name,
            group: g.group ? g.group.replace("GROUP_", "") : "-",
            played: row.playedGames,
            won: row.won,
            drawn: row.draw,
            lost: row.lost,
            points: row.points,
            goalDifference: row.goalDifference,
          }))
        );
      return { standings, source: "live" as const };
    });
  } catch (err) {
    console.warn(`[dataSource] Falling back to bundled standings snapshot: ${(err as Error).message}`);
    return { standings: FALLBACK_STANDINGS, source: "fallback" };
  }
}
