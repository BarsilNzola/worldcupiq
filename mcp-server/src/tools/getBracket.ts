import { BRACKET } from "../mockData";

export const getBracketSchema = {
  name: "get_bracket",
  description: "Returns the current knockout-stage tournament bracket, including winners of completed rounds.",
  inputSchema: {},
};

export async function getBracket() {
  return { bracket: BRACKET };
}
