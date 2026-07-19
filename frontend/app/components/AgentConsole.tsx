"use client";

import { useState } from "react";

interface AgentLogLine {
  tool: string;
  detail: string;
}

/**
 * Drives a REAL WorldCupAnalyst agent cycle against the live MCP server (via
 * /api/agent/run) and displays the actual tool-call results as they're returned — no
 * scripted/mock data. If AGENT_WALLET_PRIVATE_KEY isn't configured, the run still shows
 * real evaluation output, just skips the on-chain submission step.
 */
export function AgentConsole() {
  const [logs, setLogs] = useState<AgentLogLine[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAgentCycle() {
    setRunning(true);
    setError(null);
    setLogs([]);
    setVisibleCount(0);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Agent run failed with status ${res.status}`);
      }

      const realLogs: AgentLogLine[] = data.logs ?? [];
      setLogs(realLogs);

      // Reveal real log lines one at a time for readability, matching the original pacing —
      // but every line here is genuine tool output from this run, not scripted text.
      let i = 0;
      const interval = setInterval(() => {
        i += 1;
        setVisibleCount(i);
        if (i >= realLogs.length) {
          clearInterval(interval);
          setRunning(false);
        }
      }, 700);
    } catch (err) {
      setError((err as Error).message);
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-black/30 p-5 font-mono text-xs">
      <div className="mb-3 flex items-center justify-between uppercase tracking-widest2 text-floodlight/50">
        <span>Agent console — WorldCupAnalyst skill (live)</span>
        <button
          onClick={runAgentCycle}
          disabled={running}
          className="rounded border border-turf/40 px-2 py-1 text-turf hover:bg-turf/10 disabled:opacity-40"
        >
          {running ? "Running…" : "Run agent cycle"}
        </button>
      </div>
      <div className="space-y-1.5">
        {logs.slice(0, visibleCount).map((line, idx) => (
          <div key={idx}>
            <span className="text-scoreboard">{line.tool}</span>
            <span className="text-floodlight/70"> {line.detail}</span>
          </div>
        ))}
        {visibleCount === 0 && !running && !error && (
          <div className="text-floodlight/30">
            Idle. Press "Run agent cycle" to connect to the live MCP server and run a real
            WorldCupAnalyst evaluation.
          </div>
        )}
        {error && <div className="text-alert">Error: {error}</div>}
      </div>
    </div>
  );
}
