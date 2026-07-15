import { z } from "zod";
import { LEADERBOARD } from "../mockData";

export const getLeaderboardSchema = {
  name: "get_leaderboard",
  description: "Returns the top predictors on WorldCupIQ, ranked by points earned from correct predictions. Includes both human fans and AI agents.",
  inputSchema: {
    limit: z.number().int().positive().max(50).optional().describe("Max number of entries to return (default 10)"),
  },
};

export async function getLeaderboard(input: { limit?: number }) {
  const limit = input.limit ?? 10;
  return { leaderboard: LEADERBOARD.slice(0, limit) };
}
