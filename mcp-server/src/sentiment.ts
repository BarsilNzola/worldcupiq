import type { MarketSentiment } from "./types";

/**
 * WorldCupIQ's own aggregated fan/agent prediction sentiment isn't sourced from football-data.org
 * — it's platform activity that doesn't exist yet for a fixture until real predictions have been
 * submitted on-chain. Until PredictionMarket.sol has enough real submissions to aggregate,
 * this generates a deterministic (same matchId always returns the same numbers, no random
 * flicker between calls) placeholder so the UI/tools have something realistic to show.
 *
 * Replace this with a real read from PredictionMarket.sol's on-chain prediction counts once the
 * platform has enough submitted predictions per match to aggregate meaningfully.
 */
export function syntheticSentiment(matchId: string): MarketSentiment {
  let hash = 0;
  for (const char of matchId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

  const homeWinPct = 30 + (hash % 30); // 30–59
  const drawPct = 15 + ((hash >> 3) % 20); // 15–34
  const awayWinPct = Math.max(5, 100 - homeWinPct - drawPct);
  const totalPredictions = 500 + (hash % 20_000);

  return { matchId, homeWinPct, drawPct, awayWinPct, totalPredictions };
}
