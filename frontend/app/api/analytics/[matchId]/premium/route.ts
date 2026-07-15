import { NextResponse } from "next/server";
import { X402_GATEWAY_URL } from "../../../../../lib/constants";

/**
 * Transparent proxy to the x402 gateway's premium endpoint. Forwards the X-PAYMENT header when
 * present and passes the gateway's 402 + payment-requirements response straight through when it
 * isn't, so the browser-side useX402 hook can carry out the sign-and-retry flow unmodified.
 */
export async function GET(req: Request, { params }: { params: { matchId: string } }) {
  const paymentHeader = req.headers.get("X-PAYMENT");

  try {
    const res = await fetch(`${X402_GATEWAY_URL}/analytics/${params.matchId}/premium`, {
      headers: paymentHeader ? { "X-PAYMENT": paymentHeader } : undefined,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "x402_gateway_unreachable", detail: (err as Error).message },
      { status: 502 }
    );
  }
}
