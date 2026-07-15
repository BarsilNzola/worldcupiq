"use client";

import { useState } from "react";

interface AgentLogLine {
  tool: string;
  detail: string;
}

const DEMO_SCRIPT: AgentLogLine[] = [
  { tool: "get_fixtures", detail: "→ found 4 fixtures, 1 finished, 3 scheduled" },
  { tool: "get_match_analytics", detail: "→ free preview for bra-arg-final: home 42% / draw 26% / away 32%" },
  { tool: "get_predictions", detail: "→ market sentiment: 18,420 predictions submitted on-chain" },
  { tool: "purchase_analysis", detail: "→ paying 0.01 USDC via x402 (EIP-3009, gasless)… settled" },
  { tool: "submit_prediction", detail: "→ agent wallet 0x9De2…44e0 submitted HOME_WIN on-chain" },
];

/**
 * A lightweight, self-contained visualization of what an autonomous agent does behind the
 * scenes when it runs the WorldCupAnalyst skill against this platform's MCP server — useful
 * for the demo video's "AI Agent Mode" segment.
 */
export function AgentConsole() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  function runDemo() {
    setRunning(true);
    setStep(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= DEMO_SCRIPT.length) {
        clearInterval(interval);
        setRunning(false);
      }
    }, 900);
  }

  return (
    <div className="rounded-lg border border-line bg-black/30 p-5 font-mono text-xs">
      <div className="mb-3 flex items-center justify-between uppercase tracking-widest2 text-floodlight/50">
        <span>Agent console — WorldCupAnalyst skill</span>
        <button
          onClick={runDemo}
          disabled={running}
          className="rounded border border-turf/40 px-2 py-1 text-turf hover:bg-turf/10 disabled:opacity-40"
        >
          {running ? "Running…" : "Run agent cycle"}
        </button>
      </div>
      <div className="space-y-1.5">
        {DEMO_SCRIPT.slice(0, step).map((line, idx) => (
          <div key={idx}>
            <span className="text-scoreboard">{line.tool}</span>
            <span className="text-floodlight/70"> {line.detail}</span>
          </div>
        ))}
        {step === 0 && <div className="text-floodlight/30">Idle. Press "Run agent cycle" to simulate an MCP-driven agent.</div>}
      </div>
    </div>
  );
}
