"use client";

import { useEffect, useState } from "react";
import type { Fixture } from "../lib/types";
import { MatchCard } from "./components/MatchCard";
import { CCTPBridge } from "./components/CCTPBridge";
import { PredictionMarket } from "./components/PredictionMarket";
import { AgentConsole } from "./components/AgentConsole";

export default function HomePage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [tab, setTab] = useState<"matches" | "predictions" | "agent">("matches");

  useEffect(() => {
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => setFixtures(data.fixtures ?? []))
      .catch(() => setFixtures([]));
  }, []);

  return (
    <div className="space-y-10 pb-16">
      <section>
        <h1 className="font-display text-5xl font-800 leading-none text-floodlight">
          Smart predictions
          <br />
          for humans <span className="text-floodlight/30">and</span> <span className="text-turf">machines</span>.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-floodlight/60">
          Live World Cup analytics, transparent on-chain predictions, and pay-per-call insights —
          no subscriptions, no opaque odds. Built on Injective so AI agents can play too.
        </p>
      </section>

      <section>
        <CCTPBridge />
      </section>

      <nav className="flex gap-1 border-b border-line font-mono text-xs uppercase tracking-widest2">
        {(
          [
            ["matches", "Matches"],
            ["predictions", "Predictions"],
            ["agent", "Agent view"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-3 transition-colors ${
              tab === id ? "border-b-2 border-scoreboard text-scoreboard" : "text-floodlight/40 hover:text-floodlight/70"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "matches" && (
        <section className="grid gap-4 sm:grid-cols-2">
          {fixtures.map((fixture) => (
            <MatchCard key={fixture.matchId} fixture={fixture} />
          ))}
          {fixtures.length === 0 && <p className="font-mono text-sm text-floodlight/40">Loading fixtures…</p>}
        </section>
      )}

      {tab === "predictions" && <PredictionMarket fixtures={fixtures} />}

      {tab === "agent" && <AgentConsole />}
    </div>
  );
}
