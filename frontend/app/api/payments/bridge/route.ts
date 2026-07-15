import { NextResponse } from "next/server";

const CCTP_WORKER_URL = process.env.CCTP_WORKER_URL ?? "http://localhost:4030";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.sourceChain || !body?.amountUsdc || !body?.recipientInjectiveAddress) {
    return NextResponse.json({ error: "sourceChain, amountUsdc, and recipientInjectiveAddress are required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${CCTP_WORKER_URL}/bridge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "cctp_worker_unreachable", detail: (err as Error).message },
      { status: 502 }
    );
  }
}
