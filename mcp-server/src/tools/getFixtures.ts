import { z } from "zod";
import { FIXTURES } from "../mockData";

export const getFixturesSchema = {
  name: "get_fixtures",
  description:
    "Returns the live World Cup match schedule, optionally filtered by status (scheduled, live, finished) or team name.",
  inputSchema: {
    status: z.enum(["scheduled", "live", "finished"]).optional().describe("Filter fixtures by status"),
    team: z.string().optional().describe("Filter fixtures involving this team name"),
  },
};

export async function getFixtures(input: { status?: string; team?: string }) {
  let fixtures = FIXTURES;

  if (input.status) {
    fixtures = fixtures.filter((f) => f.status === input.status);
  }
  if (input.team) {
    const needle = input.team.toLowerCase();
    fixtures = fixtures.filter(
      (f) => f.homeTeam.toLowerCase().includes(needle) || f.awayTeam.toLowerCase().includes(needle)
    );
  }

  return { fixtures };
}
