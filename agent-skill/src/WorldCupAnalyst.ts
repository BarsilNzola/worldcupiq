import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ethers } from "ethers";
import { AnalystConfig, DEFAULT_ANALYST_CONFIG, MatchEvaluation, Outcome } from "./types";

const PREDICTION_MARKET_ABI = [
  "function submitPrediction(bytes32 matchId, string homeTeam, string awayTeam, uint64 kickoffTimestamp, uint8 pick) external",
];

export type AgentLogFn = (tool: string, detail: string) => void;

function outcomeToEnum(outcome: Outcome): number {
  return { HOME_WIN: 1, AWAY_WIN: 2, DRAW: 3 }[outcome];
}

function toMatchIdBytes32(matchId: string): string {
  return ethers.id(matchId); // keccak256(matchId), matching how the backend registers fixtures
}

/**
 * WorldCupAnalyst is the reusable "Agent Skill" that composes WorldCupIQ's MCP tools into a
 * disciplined, end-to-end workflow: evaluate → (optionally) pay for a deeper report → decide →
 * submit an on-chain prediction. Any AI agent framework can import this class, point it at the
 * WorldCupIQ MCP server, and give it a funded Injective wallet to act fully autonomously.
 */
export class WorldCupAnalyst {
  private mcpClient: Client;
  private connected = false;
  private config: AnalystConfig;
  private wallet?: ethers.Wallet;
  private predictionMarket?: ethers.Contract;

  constructor(
    private mcpServerUrl: string,
    config: Partial<AnalystConfig> = {}
  ) {
    this.config = { ...DEFAULT_ANALYST_CONFIG, ...config };
    this.mcpClient = new Client({ name: "world-cup-analyst", version: "1.0.0" });
  }

  /** Connects to the WorldCupIQ MCP server over Streamable HTTP. */
  async connect(): Promise<void> {
    if (this.connected) return;
    const transport = new StreamableHTTPClientTransport(new URL(this.mcpServerUrl));
    await this.mcpClient.connect(transport);
    this.connected = true;
  }

  /** Wires up an on-chain signer so this analyst can submit predictions autonomously. */
  connectWallet(privateKey: string, evmRpcUrl: string, predictionMarketAddress: string): void {
    const provider = new ethers.JsonRpcProvider(evmRpcUrl);
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.predictionMarket = new ethers.Contract(predictionMarketAddress, PREDICTION_MARKET_ABI, this.wallet);
  }

  private async callTool<T = any>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const result = await this.mcpClient.callTool({ name, arguments: args });
    const textBlock = (result.content as Array<{ type: string; text?: string }>).find((c) => c.type === "text");
    return JSON.parse(textBlock?.text ?? "{}") as T;
  }

  /** Picks the next scheduled fixture — used when a caller (e.g. a demo UI) doesn't already have a matchId in hand. */
  async pickUpcomingMatchId(): Promise<string | null> {
    await this.connect();
    const result = await this.callTool<{ fixtures: Array<{ matchId: string; status: string }> }>("get_fixtures", {
      status: "scheduled",
    });
    return result?.fixtures?.[0]?.matchId ?? null;
  }

  /**
   * Evaluates a match: pulls free analytics + market sentiment, compares an internal model
   * estimate against market-implied probability, and decides whether the edge justifies paying
   * for the premium report before committing to a pick.
   */
  async evaluateMatch(
    matchId: string,
    modelProbability?: { home: number; draw: number; away: number },
    onLog: AgentLogFn = () => {}
  ): Promise<MatchEvaluation> {
    await this.connect();

    const [analytics, predictions, fixturesResult] = await Promise.all([
      this.callTool("get_match_analytics", { matchId }),
      this.callTool("get_predictions", { matchId }),
      this.callTool<{ fixtures: Array<{ matchId: string; homeTeam: string; awayTeam: string; kickoffTimeUtc: string }> }>(
        "get_fixtures",
        {}
      ),
    ]);

    const fixture = fixturesResult?.fixtures?.find((f) => f.matchId === matchId);
    const label = fixture ? `${fixture.homeTeam} vs ${fixture.awayTeam}` : matchId;

    onLog("get_fixtures", `→ resolved ${label}`);
    onLog(
      "get_match_analytics",
      `→ free preview: ${analytics?.summary ?? "no summary available"}`
    );

    const marketImplied = predictions?.sentiment
      ? {
          home: predictions.sentiment.homeWinPct / 100,
          draw: predictions.sentiment.drawPct / 100,
          away: predictions.sentiment.awayWinPct / 100,
        }
      : { home: 0.34, draw: 0.33, away: 0.33 };

    onLog(
      "get_predictions",
      `→ market sentiment: home ${(marketImplied.home * 100).toFixed(0)}% / draw ${(marketImplied.draw * 100).toFixed(0)}% / away ${(marketImplied.away * 100).toFixed(0)}% (${predictions?.sentiment?.totalPredictions ?? 0} predictions)`
    );

    // A simple internal model estimate if the caller didn't supply one — in a real agent this
    // would come from the agent's own statistical/LLM model, not a coin flip.
    const model = modelProbability ?? marketImplied;

    const edges = {
      HOME_WIN: model.home - marketImplied.home,
      AWAY_WIN: model.away - marketImplied.away,
      DRAW: model.draw - marketImplied.draw,
    } as Record<Outcome, number>;

    const bestPick = (Object.keys(edges) as Outcome[]).reduce((a, b) => (edges[a] >= edges[b] ? a : b));
    const bestEdge = edges[bestPick];

    let usedPremiumReport = false;
    let rationale = analytics?.summary ?? "No summary available.";

    if (bestEdge >= this.config.minEdgeToPurchase && this.config.maxSpendPerMatchUsdc >= 0.01) {
      onLog("purchase_analysis", `→ edge ${(bestEdge * 100).toFixed(1)}% clears threshold, paying 0.01 USDC via x402…`);
      const purchase = await this.callTool("purchase_analysis", { matchId });
      if (purchase?.purchased) {
        usedPremiumReport = true;
        rationale = purchase.report?.narrative ?? rationale;
        onLog("purchase_analysis", "→ payment settled, premium report unlocked");
      } else {
        onLog("purchase_analysis", `→ purchase did not complete: ${purchase?.error ?? "unknown reason"}`);
      }
    } else {
      onLog("purchase_analysis", `→ edge ${(bestEdge * 100).toFixed(1)}% too thin, skipping paid report`);
    }

    const confidence = Math.min(0.5 + bestEdge, 0.95);

    return {
      matchId,
      homeTeam: fixture?.homeTeam ?? analytics?.homeTeam ?? "",
      awayTeam: fixture?.awayTeam ?? analytics?.awayTeam ?? "",
      kickoffTimeUtc: fixture?.kickoffTimeUtc ?? new Date().toISOString(),
      marketImpliedProbability: marketImplied,
      modelProbability: model,
      edge: bestEdge,
      recommendedPick: bestPick,
      confidence,
      usedPremiumReport,
      rationale,
    };
  }

  /**
   * Submits an on-chain prediction for the evaluated match, but only if confidence clears the
   * configured threshold — this is the "disciplined" part: the agent declines to bet on marginal
   * edges rather than predicting every match indiscriminately.
   */
  async submitPredictionIfConfident(
    evaluation: MatchEvaluation,
    onLog: AgentLogFn = () => {}
  ): Promise<{ submitted: boolean; txHash?: string; reason?: string }> {
    if (evaluation.confidence < this.config.minConfidenceToSubmit) {
      const reason = `confidence ${evaluation.confidence.toFixed(2)} below threshold ${this.config.minConfidenceToSubmit}`;
      onLog("submit_prediction", `→ declined to submit: ${reason}`);
      return { submitted: false, reason };
    }

    if (!this.predictionMarket) {
      const reason = "wallet not connected — call connectWallet() first";
      onLog("submit_prediction", `→ ${reason}`);
      return { submitted: false, reason };
    }

    const matchIdBytes32 = toMatchIdBytes32(evaluation.matchId);
    const kickoffTimestamp = Math.floor(new Date(evaluation.kickoffTimeUtc).getTime() / 1000);
    onLog("submit_prediction", `→ submitting ${evaluation.recommendedPick} on-chain (confidence ${(evaluation.confidence * 100).toFixed(0)}%)…`);
    const tx = await this.predictionMarket.submitPrediction(
      matchIdBytes32,
      evaluation.homeTeam,
      evaluation.awayTeam,
      kickoffTimestamp,
      outcomeToEnum(evaluation.recommendedPick)
    );
    const receipt = await tx.wait();
    onLog("submit_prediction", `→ confirmed on-chain, tx ${receipt.hash}`);

    return { submitted: true, txHash: receipt.hash };
  }

  /** Convenience method running the full evaluate → submit pipeline in one call. */
  async runFullCycle(
    matchId: string,
    modelProbability?: { home: number; draw: number; away: number },
    onLog: AgentLogFn = () => {}
  ) {
    const evaluation = await this.evaluateMatch(matchId, modelProbability, onLog);
    const submission = await this.submitPredictionIfConfident(evaluation, onLog);
    return { evaluation, submission };
  }
}
