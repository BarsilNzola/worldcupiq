import { NextResponse } from "next/server";

const CCTP_WORKER_URL = process.env.CCTP_WORKER_URL ?? "http://localhost:4030";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const txHash = searchParams.get("txHash");
  const sourceDomain = searchParams.get("sourceDomain");

  if (!txHash || !sourceDomain) {
    return NextResponse.json({ error: "txHash and sourceDomain query params are required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${CCTP_WORKER_URL}/attestation?txHash=${txHash}&sourceDomain=${sourceDomain}`
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "cctp_worker_unreachable", detail: (err as Error).message },
      { status: 502 }
    );
  }
}
