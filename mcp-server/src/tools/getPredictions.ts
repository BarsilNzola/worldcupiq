import { z } from "zod";
import { getFixtureById } from "../dataSource";
import { syntheticSentiment } from "../sentiment";

export const getPredictionsSchema = {
  name: "get_predictions",
  description:
    "Returns current on-chain market sentiment (aggregate prediction distribution) for a match, " +
    "sourced from the PredictionMarket smart contract on Injective.",
  inputSchema: {
    matchId: z.string().describe("The match identifier as returned by get_fixtures (numeric when live, slug-style when running on the fallback snapshot)"),
  },
};

export async function getPredictions(input: { matchId: string }) {
  const fixture = await getFixtureById(input.matchId);
  if (!fixture) {
    return { error: `Unknown matchId: ${input.matchId}` };
  }
  return { sentiment: syntheticSentiment(fixture.matchId) };
}
