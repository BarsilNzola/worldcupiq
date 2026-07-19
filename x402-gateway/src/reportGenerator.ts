import type { AnalyticsReport } from "./types";
import { getTeamsForMatch } from "./dataSource";

/**
 * Generates an analytics report for a match. In production this would call an LLM (e.g. the
 * Anthropic API) with live match/statistical context to produce the narrative and probability
 * model; here the narrative content is templated, but the team names now come from the live
 * football-data.org fixture lookup (falling back to a generic placeholder if that's unavailable),
 * so the response shape stays correct end to end regardless of data source.
 */
export async function generatePremiumReport(
  matchId: string,
  tier: "free" | "premium"
): Promise<AnalyticsReport> {
  const teams = await getTeamsForMatch(matchId);
  const homeTeam = teams?.homeTeam ?? "Team A";
  const awayTeam = teams?.awayTeam ?? "Team B";

  const base: AnalyticsReport = {
    matchId,
    homeTeam,
    awayTeam,
    generatedAt: new Date().toISOString(),
    tier,
    summary: `${homeTeam} vs ${awayTeam}: a closely contested fixture with both sides in strong recent form.`,
    keyStats: {
      homeXG_last5: 1.8,
      awayXG_last5: 1.6,
      headToHeadHomeWins: 4,
      headToHeadAwayWins: 3,
      headToHeadDraws: 2,
    },
    modelWinProbability: { home: 0.42, draw: 0.26, away: 0.32 },
    narrative:
      tier === "free"
        ? "Unlock the full report for tactical breakdowns, injury-adjusted projections, and set-piece analysis."
        : `${homeTeam} have controlled possession in 4 of their last 5 meetings but ${awayTeam} carry the higher-value ` +
          `counter-attacking threat. Weather and rest days both slightly favor ${homeTeam}. Our model gives a marginal edge ` +
          `to ${homeTeam}, with the value pick being "either team to score in both halves."`,
  };

  if (tier === "free") {
    // Strip the deep fields out of the free tier preview.
    return { ...base, keyStats: { headToHeadHomeWins: base.keyStats.headToHeadHomeWins } };
  }

  return base;
}
