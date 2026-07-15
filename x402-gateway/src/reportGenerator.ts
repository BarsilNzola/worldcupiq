import type { AnalyticsReport } from "./types";

const MOCK_FIXTURES: Record<string, { home: string; away: string }> = {
  "bra-arg-final": { home: "Brazil", away: "Argentina" },
  "fra-eng-sf1": { home: "France", away: "England" },
  "esp-ger-sf2": { home: "Spain", away: "Germany" },
};

/**
 * Generates an analytics report for a match. In production this would call an LLM (e.g. the
 * Anthropic API) with live match/statistical context to produce the narrative and probability
 * model; here we return deterministic mock content so the gateway is runnable without external
 * API keys, while keeping the exact same response shape either way.
 */
export async function generatePremiumReport(
  matchId: string,
  tier: "free" | "premium"
): Promise<AnalyticsReport> {
  const fixture = MOCK_FIXTURES[matchId] ?? { home: "Team A", away: "Team B" };

  const base: AnalyticsReport = {
    matchId,
    homeTeam: fixture.home,
    awayTeam: fixture.away,
    generatedAt: new Date().toISOString(),
    tier,
    summary: `${fixture.home} vs ${fixture.away}: a closely contested fixture with both sides in strong recent form.`,
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
        : `${fixture.home} have controlled possession in 4 of their last 5 meetings but ${fixture.away} carry the higher-value ` +
          `counter-attacking threat. Weather and rest days both slightly favor ${fixture.home}. Our model gives a marginal edge ` +
          `to ${fixture.home}, with the value pick being "either team to score in both halves."`,
  };

  if (tier === "free") {
    // Strip the deep fields out of the free tier preview.
    return { ...base, keyStats: { headToHeadHomeWins: base.keyStats.headToHeadHomeWins } };
  }

  return base;
}
