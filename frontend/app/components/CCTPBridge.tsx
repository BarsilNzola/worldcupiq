"use client";

import { useState } from "react";
import { useInjectiveWallet } from "../../hooks/useInjectiveWallet";
import { useCCTP } from "../../hooks/useCCTP";
import { SOURCE_CHAINS } from "../../lib/constants";

export function CCTPBridge() {
  const { address, connect, connecting } = useInjectiveWallet();
  const { bridge, bridging, result, error } = useCCTP();
  const [sourceChain, setSourceChain] = useState<(typeof SOURCE_CHAINS)[number]["id"]>("base");
  const [amount, setAmount] = useState("25.00");

  async function handleBridge() {
    if (!address) {
      await connect();
      return;
    }
    await bridge({ sourceChain, amountUsdc: amount, recipientInjectiveAddress: address }).catch(() => {});
  }

  return (
    <div className="rounded-lg border border-line bg-pitch-light/60 p-5">
      <div className="mb-4 font-mono text-[11px] uppercase tracking-widest2 text-floodlight/50">
        Top up with CCTP
      </div>

      <div className="mb-4 flex gap-2">
        {SOURCE_CHAINS.map((chain) => (
          <button
            key={chain.id}
            onClick={() => setSourceChain(chain.id)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              sourceChain === chain.id
                ? "border-turf bg-turf/15 text-turf"
                : "border-line text-floodlight/60 hover:border-floodlight/30"
            }`}
          >
            {chain.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="font-mono text-sm text-floodlight/50">$</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="w-28 rounded-md border border-line bg-transparent px-2 py-1.5 font-mono text-sm text-floodlight outline-none focus:border-turf"
        />
        <span className="font-mono text-sm text-floodlight/50">USDC → Injective</span>
      </div>

      <button
        onClick={handleBridge}
        disabled={connecting || bridging}
        className="w-full rounded-md bg-turf px-4 py-2.5 text-sm font-600 text-pitch transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {connecting ? "Connecting wallet…" : bridging ? "Bridging…" : !address ? "Connect wallet" : "Bridge USDC"}
      </button>

      {error && <p className="mt-2 font-mono text-xs text-alert">{error}</p>}

      {result && (
        <ol className="mt-4 space-y-1.5 font-mono text-xs">
          {result.steps.map((step) => (
            <li key={step.step} className="flex items-center gap-2">
              <span
                className={
                  step.status === "complete"
                    ? "text-turf"
                    : step.status === "failed"
                    ? "text-alert"
                    : "text-floodlight/50"
                }
              >
                {step.status === "complete" ? "✓" : step.status === "failed" ? "✕" : "…"}
              </span>
              <span className="capitalize text-floodlight/70">{step.step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
