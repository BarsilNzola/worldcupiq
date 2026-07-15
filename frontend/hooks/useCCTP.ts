"use client";

import { useCallback, useState } from "react";
import type { BridgeResult } from "../lib/types";

interface BridgeParams {
  sourceChain: "ethereum" | "base" | "solana";
  amountUsdc: string;
  recipientInjectiveAddress: string;
}

/**
 * Drives the CCTP on-ramp via our backend /api/payments (which proxies to the cctp worker
 * service). The browser never handles a raw private key here — real usage should have the
 * wallet sign the burn transaction directly; this hook demonstrates the request/response shape.
 */
export function useCCTP() {
  const [result, setResult] = useState<BridgeResult | null>(null);
  const [bridging, setBridging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bridge = useCallback(async (params: BridgeParams) => {
    setBridging(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/payments/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Bridge request failed with status ${res.status}`);
      }
      const data = (await res.json()) as BridgeResult;
      setResult(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setBridging(false);
    }
  }, []);

  return { bridge, bridging, result, error };
}
