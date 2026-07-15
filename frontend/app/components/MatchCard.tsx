"use client";

import type { Fixture } from "../../lib/types";
import { X402Payment } from "./X402Payment";

export function MatchCard({ fixture }: { fixture: Fixture }) {
  const isLive = fixture.status === "live";
  const isFinished = fixture.status === "finished";
  const kickoff = new Date(fixture.kickoffTimeUtc);

  return (
    <div className="rounded-lg border border-line bg-pitch-light/60 p-5 transition-colors hover:border-turf/60">
      <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest2 text-floodlight/50">
        <span>{fixture.stage}</span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-alert">
            <span className="h-1.5 w-1.5 rounded-full bg-alert animate-pulse-live" /> live
          </span>
        ) : isFinished ? (
          <span>final</span>
        ) : (
          <span>{kickoff.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="font-display text-xl font-600 text-floodlight">{fixture.homeTeam}</div>
          <div className="font-display text-xl font-600 text-floodlight">{fixture.awayTeam}</div>
        </div>
        <div className="scoreboard-digit text-right text-3xl text-scoreboard">
          {isFinished ? (
            <>
              <div>{fixture.homeScore}</div>
              <div>{fixture.awayScore}</div>
            </>
          ) : (
            <>
              <div className="opacity-30">–</div>
              <div className="opacity-30">–</div>
            </>
          )}
        </div>
      </div>

      <div className="my-4 h-px bg-line" />

      {fixture.marketOdds && (
        <div className="mb-4 flex gap-4 font-mono text-xs text-floodlight/60">
          <span>Home {(fixture.marketOdds.home * 100).toFixed(0)}%</span>
          <span>Draw {(fixture.marketOdds.draw * 100).toFixed(0)}%</span>
          <span>Away {(fixture.marketOdds.away * 100).toFixed(0)}%</span>
          {fixture.modelConfidence && (
            <span className="ml-auto text-turf">AI confidence {(fixture.modelConfidence * 100).toFixed(0)}%</span>
          )}
        </div>
      )}

      <X402Payment matchId={fixture.matchId} />
    </div>
  );
}
