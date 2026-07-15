import { z } from "zod";
import { MARKET_SENTIMENT } from "../mockData";

export const getPredictionsSchema = {
  name: "get_predictions",
  description:
    "Returns current on-chain market sentiment (aggregate prediction distribution) for a match, " +
    "sourced from the PredictionMarket smart contract on Injective.",
  inputSchema: {
    matchId: z.string().describe("The match identifier, e.g. 'bra-arg-final'"),
  },
};

export async function getPredictions(input: { matchId: string }) {
  const sentiment = MARKET_SENTIMENT[input.matchId];
  if (!sentiment) {
    return { error: `No prediction data for matchId: ${input.matchId}` };
  }
  return { sentiment };
}
