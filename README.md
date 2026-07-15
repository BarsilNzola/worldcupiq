# WorldCupIQ

**AI-powered smart prediction & analytics platform for the Injective Global Cup.**

WorldCupIQ gives fans transparent, on-chain World Cup predictions and pay-per-use match
analytics — and gives AI agents a native way to do the same thing autonomously. It integrates
four pieces of Injective's stack end to end: **x402** micropayments, **Circle CCTP V2**
cross-chain USDC bridging, an **MCP server**, and a reusable **Agent Skill**.

## The problem

World Cup fans currently have to choose between centralized, opaque prediction apps; match
analytics locked behind $30+/month subscriptions; and slow, expensive cross-border payments for
getting funds where they need to be. AI agents are shut out of all of it — there's no
machine-readable way for an agent to see live data, pay for what it needs, or participate in a
prediction market on a fan's behalf.

## How Injective technologies are used

**x402 — pay-per-call micropayments.**
Every match's "Deep Report" is metered, not subscribed to. The frontend (or an AI agent) requests
`/analytics/:matchId/premium`; the gateway replies `402 Payment Required` with signed payment
requirements; the caller signs an EIP-3009 `transferWithAuthorization` message (gasless — no
on-chain transaction from the payer) and retries with an `X-PAYMENT` header. The gateway verifies
and settles the payment, then serves the report. Implemented in `x402-gateway/src/gateway.ts` and
`x402-gateway/src/verify.ts`.

**Circle CCTP V2 — cross-chain USDC on-ramp.**
New fans and agents rarely start with funds already on Injective. The `cctp/` service drives
Circle's native burn-and-mint bridge — `depositForBurn` on the source chain (Ethereum, Base, or
Solana), poll Circle's Iris attestation service, then `receiveMessage` on Injective (CCTP domain
29) to mint the equivalent USDC. Implemented in `cctp/src/bridge.ts`.

**MCP server — machine-native platform access.**
`mcp-server/` exposes 7 tools over the Model Context Protocol (Streamable HTTP by default, stdio
for local agent runtimes): `get_fixtures`, `get_match_analytics`, `get_standings`, `get_bracket`,
`get_predictions`, `get_leaderboard`, and `purchase_analysis`. Any MCP-compatible agent can
discover and call these directly — no bespoke integration required.

**Agent Skill — a reusable autonomous workflow.**
`agent-skill/src/WorldCupAnalyst.ts` composes the MCP tools into one disciplined pipeline:
evaluate a match's model-vs-market edge → pay for the premium report via `purchase_analysis` only
when the edge justifies the cost → submit an on-chain prediction only above a confidence
threshold. Any agent framework can import `WorldCupAnalyst`, hand it a funded Injective wallet,
and call `runFullCycle(matchId)`.

### Sample end-to-end agent flow

1. Agent calls `get_fixtures` → sees Brazil vs Argentina is upcoming.
2. Agent calls `get_match_analytics` → gets the free preview.
3. Agent compares its own model probability against market-implied odds (`get_predictions`) and
   finds a value edge.
4. If funds are low, the agent tops up USDC on Injective via the CCTP bridge.
5. Agent calls `purchase_analysis` → the MCP server signs an x402 payment and pays $0.01 USDC.
6. Agent receives the full report, decides it's confident enough, and submits its prediction
   on-chain through `PredictionMarket.sol`.

## Repository layout

```
worldcupiq/
├── frontend/        Next.js app — dashboard, wallet connect, CCTP bridge UI, x402 unlock flow
├── contracts/        Solidity PredictionMarket contract (Foundry) + deploy script + tests
├── x402-gateway/      Express service implementing the x402 pay-per-call flow
├── cctp/              Circle CCTP V2 burn/attest/mint bridge worker + HTTP API
├── mcp-server/        MCP server exposing 7 tools over Streamable HTTP / stdio
├── agent-skill/       WorldCupAnalyst — reusable agent skill wrapping the MCP tools
├── docker-compose.yml Runs frontend + gateway + mcp-server + cctp-worker together
└── .env.example       All required environment variables, documented inline
```

## Running it locally

```bash
cp .env.example .env   # fill in RPC URLs, keys, and contract addresses
npm install             # installs all workspaces

# Deploy the contract (requires foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup)
cd contracts && forge build && npm run deploy && cd ..

# Run each service (separate terminals), or `npm run docker:up` to run everything together
npm run dev:gateway     # x402 gateway on :4021
npm run dev:mcp         # MCP server on :7420
npm run dev:frontend    # Next.js app on :3000
```

To see the agent flow directly without the UI:

```bash
cd agent-skill && npm run test:cycle
```

## What problem this solves

Fans get transparent, verifiable predictions instead of a black-box betting app; pay-per-use
analytics at $0.01 a report instead of a monthly subscription; and a two-click way to get funds
onto Injective from whichever chain they already hold USDC on. AI agents get the same access
through the same MCP tools — the platform doesn't have a separate, worse interface for machines.

## Security & production notes

This is a hackathon-scope reference implementation. Before any real value moves through it:
address zero-checks, the exact inEVM chain ID, and USDC/TokenMessenger/MessageTransmitter contract
addresses in `cctp/src/config.ts` (and `INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS` in `.env`) all need
to be replaced with verified, current values from Circle's and Injective's own documentation. The
CCTP mint step now decodes the real `MessageSent` event bytes from the burn transaction's logs
(`cctp/src/bridge.ts`), so no placeholder remains there — but no private key should ever be sent
over HTTP in a production deployment; signing should happen client-side in the caller's own wallet
or agent process instead.
