"use client";

import { useEffect, useState } from "react";
import type { Fixture, LeaderboardEntry, Outcome } from "../../lib/types";
import { useInjectiveWallet } from "../../hooks/useInjectiveWallet";
import { getPredictionMarketContract, matchIdToBytes32 } from "../../lib/injective";

const OUTCOME_ENUM: Record<Outcome, number> = { HOME_WIN: 1, AWAY_WIN: 2, DRAW: 3 };

export function PredictionMarket({ fixtures }: { fixtures: Fixture[] }) {
  const { address, provider, connecting, connect } = useInjectiveWallet();
  const [selected, setSelected] = useState<Record<string, Outcome>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetch("/api/matches")
      .then(() => {
        // Leaderboard mock — in production this reads mcp-server's get_leaderboard tool output.
        setLeaderboard([
          { rank: 1, address: "0xA1c3...9F2b", displayName: "PitchOracle-Agent", points: 480, isAgent: true },
          { rank: 2, address: "0x77Bd...11aC", displayName: "futbol_fan_23", points: 460, isAgent: false },
          { rank: 3, address: "0x9De2...44e0", displayName: "ValueBettorBot", points: 440, isAgent: true },
        ]);
      })
      .catch(() => {});
  }, []);

  async function submitPrediction(matchId: string) {
    const pick = selected[matchId];
    if (!pick) return;

    if (!address || !provider) {
      await connect();
      return;
    }

    const contractAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS;
    if (!contractAddress) {
      setError("Prediction market contract not configured — set NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS.");
      return;
    }

    const fixture = fixtures.find((f) => f.matchId === matchId);
    if (!fixture) {
      setError(`Could not find fixture data for ${matchId}.`);
      return;
    }

    setSubmitting(matchId);
    setError(null);
    try {
      const contract = await getPredictionMarketContract(provider, contractAddress);
      const kickoffTimestamp = Math.floor(new Date(fixture.kickoffTimeUtc).getTime() / 1000);
      const tx = await contract.submitPrediction(
        matchIdToBytes32(matchId),
        fixture.homeTeam,
        fixture.awayTeam,
        kickoffTimestamp,
        OUTCOME_ENUM[pick]
      );
      const receipt = await tx.wait();
      setTxHashes((prev) => ({ ...prev, [matchId]: receipt.hash }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  const upcoming = fixtures.filter((f) => f.status === "scheduled");

  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3">
        {upcoming.map((fixture) => (
          <div key={fixture.matchId} className="rounded-lg border border-line bg-pitch-light/60 p-4">
            <div className="mb-3 font-display text-lg text-floodlight">
              {fixture.homeTeam} <span className="text-floodlight/40">vs</span> {fixture.awayTeam}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["HOME_WIN", "DRAW", "AWAY_WIN"] as Outcome[]).map((outcome) => (
                <button
                  key={outcome}
                  onClick={() => setSelected((prev) => ({ ...prev, [fixture.matchId]: outcome }))}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    selected[fixture.matchId] === outcome
                      ? "border-scoreboard bg-scoreboard/15 text-scoreboard"
                      : "border-line text-floodlight/60 hover:border-floodlight/30"
                  }`}
                >
                  {outcome === "HOME_WIN" ? fixture.homeTeam : outcome === "AWAY_WIN" ? fixture.awayTeam : "Draw"}
                </button>
              ))}
              <button
                onClick={() => submitPrediction(fixture.matchId)}
                disabled={!selected[fixture.matchId] || submitting === fixture.matchId || connecting}
                className="ml-auto rounded-md bg-turf px-4 py-1.5 text-sm font-600 text-pitch disabled:opacity-40"
              >
                {submitting === fixture.matchId ? "Submitting…" : txHashes[fixture.matchId] ? "Submitted ✓" : "Submit on-chain"}
              </button>
            </div>
            {txHashes[fixture.matchId] && (
              <p className="mt-2 font-mono text-[11px] text-floodlight/40">tx: {txHashes[fixture.matchId]}</p>
            )}
          </div>
        ))}
        {error && <p className="font-mono text-xs text-alert">{error}</p>}
      </div>

      <div className="rounded-lg border border-line bg-pitch-light/60 p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-widest2 text-floodlight/50">Leaderboard</div>
        <ol className="space-y-2">
          {leaderboard.map((entry) => (
            <li key={entry.rank} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="font-mono text-floodlight/40">#{entry.rank}</span>
                <span className="text-floodlight">{entry.displayName}</span>
                {entry.isAgent && (
                  <span className="rounded bg-turf/15 px-1.5 py-0.5 font-mono text-[10px] text-turf">agent</span>
                )}
              </span>
              <span className="scoreboard-digit text-scoreboard">{entry.points}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
