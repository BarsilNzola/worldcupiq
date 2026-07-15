import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorldCupIQ — Smart predictions for humans and machines",
  description:
    "Real-time World Cup analytics, transparent on-chain predictions, and pay-per-call insights — built on Injective for fans and AI agents alike.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen antialiased">
        <div className="mx-auto max-w-6xl px-6">
          <header className="flex items-center justify-between py-8">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-800 tracking-tight text-floodlight">
                WorldCup<span className="text-scoreboard">IQ</span>
              </span>
              <span className="hidden font-mono text-xs uppercase tracking-widest2 text-turf sm:inline">
                on Injective
              </span>
            </div>
            <nav className="font-mono text-xs uppercase tracking-widest2 text-floodlight/60">
              <span>Fixtures · Predictions · Analytics</span>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="mt-20 border-t border-line py-8 font-mono text-xs text-floodlight/40">
            WorldCupIQ · x402 micropayments · Circle CCTP V2 · MCP agent tools · Injective Global Cup
          </footer>
        </div>
      </body>
    </html>
  );
}
