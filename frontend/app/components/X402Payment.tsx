"use client";

import { useState } from "react";
import { useInjectiveWallet } from "../../hooks/useInjectiveWallet";
import { useX402 } from "../../hooks/useX402";

export function X402Payment({ matchId }: { matchId: string }) {
  const { address, provider, connecting, connect } = useInjectiveWallet();
  const { unlockPremiumReport, report, paying, error } = useX402(provider);
  const [expanded, setExpanded] = useState(false);

  async function handleUnlock() {
    if (!address) {
      await connect();
      return;
    }
    const result = await unlockPremiumReport(matchId).catch(() => null);
    if (result) setExpanded(true);
  }

  if (report && expanded) {
    return (
      <div className="rounded-md border border-turf/40 bg-turf/10 p-4">
        <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest2 text-turf">
          <span>Deep report unlocked</span>
          <button onClick={() => setExpanded(false)} className="text-floodlight/50 hover:text-floodlight">
            hide
          </button>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-floodlight/85">{report.narrative}</p>
        {report.modelWinProbability && (
          <div className="flex gap-4 font-mono text-xs text-floodlight/60">
            <span>Home {(report.modelWinProbability.home * 100).toFixed(0)}%</span>
            <span>Draw {(report.modelWinProbability.draw * 100).toFixed(0)}%</span>
            <span>Away {(report.modelWinProbability.away * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleUnlock}
        disabled={connecting || paying}
        className="w-full rounded-md bg-scoreboard px-4 py-2.5 text-sm font-600 text-pitch transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {connecting
          ? "Connecting wallet…"
          : paying
          ? "Confirm payment in wallet…"
          : !address
          ? "Connect wallet to unlock report"
          : "Unlock full report — $0.01 USDC via x402"}
      </button>
      {error && <p className="mt-2 font-mono text-xs text-alert">{error}</p>}
    </div>
  );
}
