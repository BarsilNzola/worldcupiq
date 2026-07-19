import { NextResponse } from "next/server";
import { WorldCupAnalyst } from "@worldcupiq/agent-skill";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mcpUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL
    ? `${process.env.NEXT_PUBLIC_MCP_SERVER_URL}/mcp`
    : "http://localhost:7420/mcp";

  const logs: Array<{ tool: string; detail: string }> = [];
  const onLog = (tool: string, detail: string) => logs.push({ tool, detail });

  try {
    const analyst = new WorldCupAnalyst(mcpUrl);

    const matchId: string | null = body.matchId ?? (await analyst.pickUpcomingMatchId());
    if (!matchId) {
      return NextResponse.json({ error: "no_upcoming_match_found", logs }, { status: 404 });
    }

    const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY;
    const rpcUrl = process.env.INJECTIVE_EVM_RPC_URL;
    const contractAddress = process.env.PREDICTION_MARKET_CONTRACT_ADDRESS;

    if (privateKey && rpcUrl && contractAddress) {
      analyst.connectWallet(privateKey, rpcUrl, contractAddress);
    } else {
      onLog("connect_wallet", "→ AGENT_WALLET_PRIVATE_KEY not configured — evaluation only, submission will be skipped");
    }

    const { evaluation, submission } = await analyst.runFullCycle(matchId, undefined, onLog);

    return NextResponse.json({ matchId, evaluation, submission, logs });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, logs },
      { status: 502 }
    );
  }
}
