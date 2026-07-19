import * as dotenv from "dotenv";
import * as path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { getFixtures, getFixturesSchema } from "./tools/getFixtures";
import { getMatchAnalytics, getMatchAnalyticsSchema } from "./tools/getMatchAnalytics";
import { getStandings, getStandingsSchema } from "./tools/getStandings";
import { getBracket, getBracketSchema } from "./tools/getBracket";
import { getPredictions, getPredictionsSchema } from "./tools/getPredictions";
import { getLeaderboard, getLeaderboardSchema } from "./tools/getLeaderboard";
import { purchaseAnalysis, purchaseAnalysisSchema } from "./tools/purchaseAnalysis";

function buildServer(): McpServer {
  const server = new McpServer({ name: "worldcupiq-mcp", version: "1.0.0" });

  server.registerTool(
    getFixturesSchema.name,
    { description: getFixturesSchema.description, inputSchema: getFixturesSchema.inputSchema },
    async (input) => ({ content: [{ type: "text", text: JSON.stringify(await getFixtures(input)) }] })
  );

  server.registerTool(
    getMatchAnalyticsSchema.name,
    { description: getMatchAnalyticsSchema.description, inputSchema: getMatchAnalyticsSchema.inputSchema },
    async (input) => ({ content: [{ type: "text", text: JSON.stringify(await getMatchAnalytics(input)) }] })
  );

  server.registerTool(
    getStandingsSchema.name,
    { description: getStandingsSchema.description, inputSchema: getStandingsSchema.inputSchema },
    async () => ({ content: [{ type: "text", text: JSON.stringify(await getStandings()) }] })
  );

  server.registerTool(
    getBracketSchema.name,
    { description: getBracketSchema.description, inputSchema: getBracketSchema.inputSchema },
    async () => ({ content: [{ type: "text", text: JSON.stringify(await getBracket()) }] })
  );

  server.registerTool(
    getPredictionsSchema.name,
    { description: getPredictionsSchema.description, inputSchema: getPredictionsSchema.inputSchema },
    async (input) => ({ content: [{ type: "text", text: JSON.stringify(await getPredictions(input)) }] })
  );

  server.registerTool(
    getLeaderboardSchema.name,
    { description: getLeaderboardSchema.description, inputSchema: getLeaderboardSchema.inputSchema },
    async (input) => ({ content: [{ type: "text", text: JSON.stringify(await getLeaderboard(input)) }] })
  );

  server.registerTool(
    purchaseAnalysisSchema.name,
    { description: purchaseAnalysisSchema.description, inputSchema: purchaseAnalysisSchema.inputSchema },
    async (input) => ({ content: [{ type: "text", text: JSON.stringify(await purchaseAnalysis(input)) }] })
  );

  return server;
}

const transportMode = process.argv.includes("--stdio") ? "stdio" : "http";

if (transportMode === "stdio") {
  // For local agent frameworks (e.g. Claude Desktop, Claude Code) that spawn the MCP server
  // as a subprocess and speak over stdio.
  const server = buildServer();
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.error("WorldCupIQ MCP server running on stdio");
  });
} else {
  // For remote agents connecting over HTTP (Streamable HTTP transport).
  const app = express();
  app.use(express.json());

  const PORT = Number(process.env.MCP_SERVER_PORT ?? 7420);

  app.post("/mcp", async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req, res) => res.json({ status: "ok", tools: 7 }));

  app.listen(PORT, () => {
    console.log(`WorldCupIQ MCP server listening on :${PORT} (Streamable HTTP at /mcp)`);
  });
}
