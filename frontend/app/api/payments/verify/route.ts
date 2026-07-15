import { NextResponse } from "next/server";
import { X402_GATEWAY_URL } from "../../../../lib/constants";

/**
 * Lightweight pass-through used by the UI to show payment status before committing to the full
 * paid request — hits the gateway's free preview endpoint's health rather than duplicating its
 * verification logic (which lives in x402-gateway/src/verify.ts, the source of truth).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  try {
    const health = await fetch(`${X402_GATEWAY_URL}/health`);
    return NextResponse.json({ gatewayReachable: health.ok, matchId: body.matchId });
  } catch (err) {
    return NextResponse.json({ gatewayReachable: false, error: (err as Error).message }, { status: 502 });
  }
}
