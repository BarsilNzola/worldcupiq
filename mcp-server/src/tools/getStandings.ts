import { STANDINGS } from "../mockData";

export const getStandingsSchema = {
  name: "get_standings",
  description: "Returns current group/knockout stage standings for all tracked teams, sorted by points.",
  inputSchema: {},
};

export async function getStandings() {
  const sorted = [...STANDINGS].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
  return { standings: sorted };
}
