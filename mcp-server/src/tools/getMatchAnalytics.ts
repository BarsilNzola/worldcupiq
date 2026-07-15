import { z } from "zod";
import { FIXTURES, MARKET_SENTIMENT } from "../mockData";

export const getMatchAnalyticsSchema = {
  name: "get_match_analytics",
  description:
    "Returns a FREE preview of AI-generated analytics for a specific match (basic stats + summary). " +
    "For the full premium report with tactical breakdown and model probabilities, use purchase_analysis instead.",
  inputSchema: {
    matchId: z.string().describe("The match identifier, e.g. 'bra-arg-final' (see get_fixtures)"),
  },
};

export async function getMatchAnalytics(input: { matchId: string }) {
  const fixture = FIXTURES.find((f) => f.matchId === input.matchId);
  if (!fixture) {
    return { error: `Unknown matchId: ${input.matchId}` };
  }

  const sentiment = MARKET_SENTIMENT[input.matchId];

  return {
    matchId: fixture.matchId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    stage: fixture.stage,
    tier: "free",
    summary: `${fixture.homeTeam} vs ${fixture.awayTeam}: a closely contested ${fixture.stage.toLowerCase()} with both sides in strong recent form.`,
    marketSentimentPreview: sentiment
      ? { homeWinPct: sentiment.homeWinPct, awayWinPct: sentiment.awayWinPct }
      : undefined,
    note: "This is a free preview. Call purchase_analysis for the full tactical report (costs 0.01 USDC via x402).",
  };
}
