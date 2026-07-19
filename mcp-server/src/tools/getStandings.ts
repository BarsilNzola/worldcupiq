import { getLiveStandings } from "../dataSource";

export const getStandingsSchema = {
  name: "get_standings",
  description: "Returns current group/knockout stage standings for all tracked teams, sorted by points.",
  inputSchema: {},
};

export async function getStandings() {
  const { standings, source } = await getLiveStandings();
  const sorted = [...standings].sort(
    (a, b) => a.group.localeCompare(b.group) || b.points - a.points || b.won - a.won
  );
  return { standings: sorted, dataSource: source };
}
