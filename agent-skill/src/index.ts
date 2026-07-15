export { WorldCupAnalyst } from "./WorldCupAnalyst";
export type { AnalystConfig, MatchEvaluation, Outcome } from "./types";
export { DEFAULT_ANALYST_CONFIG } from "./types";

/**
 * Example usage (see README for the full walkthrough):
 *
 *   import { WorldCupAnalyst } from "@worldcupiq/agent-skill";
 *
 *   const analyst = new WorldCupAnalyst(process.env.MCP_SERVER_URL!);
 *   analyst.connectWallet(
 *     process.env.AGENT_WALLET_PRIVATE_KEY!,
 *     process.env.INJECTIVE_EVM_RPC_URL!,
 *     process.env.PREDICTION_MARKET_CONTRACT_ADDRESS!
 *   );
 *
 *   const { evaluation, submission } = await analyst.runFullCycle("bra-arg-final");
 *   console.log(evaluation.rationale, submission);
 */
