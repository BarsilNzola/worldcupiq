import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ethers } from "ethers";
import { AnalystConfig, DEFAULT_ANALYST_CONFIG, MatchEvaluation, Outcome } from "./types";

const PREDICTION_MARKET_ABI = [
  "function submitPrediction(bytes32 matchId, uint8 pick) external",
];

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

  /**
   * Evaluates a match: pulls free analytics + market sentiment, compares an internal model
   * estimate against market-implied probability, and decides whether the edge justifies paying
   * for the premium report before committing to a pick.
   */
  async evaluateMatch(matchId: string, modelProbability?: { home: number; draw: number; away: number }): Promise<MatchEvaluation> {
    await this.connect();

    const [analytics, predictions] = await Promise.all([
      this.callTool("get_match_analytics", { matchId }),
      this.callTool("get_predictions", { matchId }),
    ]);

    const marketImplied = predictions?.sentiment
      ? {
          home: predictions.sentiment.homeWinPct / 100,
          draw: predictions.sentiment.drawPct / 100,
          away: predictions.sentiment.awayWinPct / 100,
        }
      : { home: 0.34, draw: 0.33, away: 0.33 };

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
      const purchase = await this.callTool("purchase_analysis", { matchId });
      if (purchase?.purchased) {
        usedPremiumReport = true;
        rationale = purchase.report?.narrative ?? rationale;
      }
    }

    const confidence = Math.min(0.5 + bestEdge, 0.95);

    return {
      matchId,
      homeTeam: analytics?.homeTeam ?? "",
      awayTeam: analytics?.awayTeam ?? "",
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
  async submitPredictionIfConfident(evaluation: MatchEvaluation): Promise<{ submitted: boolean; txHash?: string; reason?: string }> {
    if (evaluation.confidence < this.config.minConfidenceToSubmit) {
      return { submitted: false, reason: `confidence ${evaluation.confidence.toFixed(2)} below threshold ${this.config.minConfidenceToSubmit}` };
    }

    if (!this.predictionMarket) {
      return { submitted: false, reason: "wallet not connected — call connectWallet() first" };
    }

    const matchIdBytes32 = toMatchIdBytes32(evaluation.matchId);
    const tx = await this.predictionMarket.submitPrediction(matchIdBytes32, outcomeToEnum(evaluation.recommendedPick));
    const receipt = await tx.wait();

    return { submitted: true, txHash: receipt.hash };
  }

  /** Convenience method running the full evaluate → submit pipeline in one call. */
  async runFullCycle(matchId: string, modelProbability?: { home: number; draw: number; away: number }) {
    const evaluation = await this.evaluateMatch(matchId, modelProbability);
    const submission = await this.submitPredictionIfConfident(evaluation);
    return { evaluation, submission };
  }
}
