import { z } from "zod";
import { getFixtureById } from "../dataSource";
import { syntheticSentiment } from "../sentiment";

export const getMatchAnalyticsSchema = {
  name: "get_match_analytics",
  description:
    "Returns a FREE preview of AI-generated analytics for a specific match (basic stats + summary). " +
    "For the full premium report with tactical breakdown and model probabilities, use purchase_analysis instead.",
  inputSchema: {
    matchId: z.string().describe("The match identifier as returned by get_fixtures (a numeric ID from the live data source, or a slug like 'eng-arg-sf2' when running on the bundled fallback)"),
  },
};

export async function getMatchAnalytics(input: { matchId: string }) {
  const fixture = await getFixtureById(input.matchId);
  if (!fixture) {
    return { error: `Unknown matchId: ${input.matchId}` };
  }

  const sentiment = syntheticSentiment(fixture.matchId);

  return {
    matchId: fixture.matchId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    stage: fixture.stage,
    tier: "free",
    summary: `${fixture.homeTeam} vs ${fixture.awayTeam}: a closely contested ${fixture.stage.toLowerCase()}.`,
    marketSentimentPreview: { homeWinPct: sentiment.homeWinPct, awayWinPct: sentiment.awayWinPct },
    note: "This is a free preview. Call purchase_analysis for the full tactical report (costs 0.01 USDC via x402).",
  };
}
