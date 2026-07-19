import { getLiveFixtures } from "../dataSource";

export const getBracketSchema = {
  name: "get_bracket",
  description: "Returns the current knockout-stage tournament bracket, including winners of completed rounds.",
  inputSchema: {},
};

const KNOCKOUT_ROUND_ORDER = ["Round of 16", "Quarter-final", "Semi-final", "Third-place playoff", "Final"];

export async function getBracket() {
  const { fixtures, source } = await getLiveFixtures();

  const bracket = fixtures
    .filter((f) => KNOCKOUT_ROUND_ORDER.includes(f.stage))
    .sort(
      (a, b) =>
        KNOCKOUT_ROUND_ORDER.indexOf(a.stage) - KNOCKOUT_ROUND_ORDER.indexOf(b.stage) ||
        new Date(a.kickoffTimeUtc).getTime() - new Date(b.kickoffTimeUtc).getTime()
    )
    .map((f) => ({
      round: f.stage,
      matchId: f.matchId,
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      winner:
        f.status === "finished" && f.homeScore !== undefined && f.awayScore !== undefined
          ? f.homeScore > f.awayScore
            ? f.homeTeam
            : f.awayScore > f.homeScore
            ? f.awayTeam
            : undefined
          : undefined,
    }));

  return { bracket, dataSource: source };
}
