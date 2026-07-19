/**
 * Minimal live fixture lookup for the gateway — a separate deployable service from mcp-server,
 * so it keeps its own small copy of this logic rather than sharing a package across workspaces.
 * See mcp-server/src/dataSource.ts for the fuller version (fixtures + standings + caching).
 */
const COMPETITION_CODE = "WC";
const CACHE_TTL_MS = 30_000;

interface TeamNames {
  homeTeam: string;
  awayTeam: string;
  stage: string;
}

interface FootballDataMatch {
  id: number;
  stage: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
}

let cache: { fixtures: Map<string, TeamNames>; expiresAt: number } | null = null;

async function loadFixtureMap(): Promise<Map<string, TeamNames>> {
  if (cache && cache.expiresAt > Date.now()) return cache.fixtures;

  // Read lazily at call time, not module-load time — see mcp-server/src/dataSource.ts for why.
  const baseUrl = process.env.WORLDCUP_DATA_API_BASE_URL ?? "https://api.football-data.org/v4";
  const apiKey = process.env.WORLDCUP_DATA_API_KEY;
  if (!apiKey) throw new Error("WORLDCUP_DATA_API_KEY not configured");

  const res = await fetch(`${baseUrl}/competitions/${COMPETITION_CODE}/matches`, {
    headers: { "X-Auth-Token": apiKey },
  });
  if (!res.ok) throw new Error(`football-data.org request failed: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as { matches: FootballDataMatch[] };
  const map = new Map<string, TeamNames>();
  for (const m of data.matches) {
    map.set(String(m.id), { homeTeam: m.homeTeam.name, awayTeam: m.awayTeam.name, stage: m.stage });
  }

  cache = { fixtures: map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

/** Returns null (rather than throwing) on any failure — callers fall back to a generic placeholder. */
export async function getTeamsForMatch(matchId: string): Promise<TeamNames | null> {
  try {
    const map = await loadFixtureMap();
    return map.get(matchId) ?? null;
  } catch (err) {
    console.warn(`[dataSource] Live fixture lookup failed, using generic placeholder: ${(err as Error).message}`);
    return null;
  }
}
