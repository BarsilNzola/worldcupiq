import { NextResponse } from "next/server";
import { X402_GATEWAY_URL } from "../../../lib/constants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId query param is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${X402_GATEWAY_URL}/analytics/${matchId}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "x402_gateway_unreachable", detail: (err as Error).message },
      { status: 502 }
    );
  }
}
