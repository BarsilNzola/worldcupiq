# Single-container Dockerfile for Render — builds and runs the whole WorldCupIQ stack
# (frontend + x402 gateway + MCP server + CCTP worker) as one deployable service.
#
# Only the frontend is exposed publicly (Render's $PORT). The gateway, MCP server, and CCTP
# worker run inside the same container and are reached by the frontend over localhost — they
# never need to be internet-facing themselves.
#
# Env vars (WORLDCUP_DATA_API_KEY, contract addresses, private keys, etc.) are NOT baked into
# this image — set them in Render's dashboard as real environment variables. dotenv's calls to
# load a local .env file simply no-op in production since no .env file is shipped in the image.

FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy workspace manifests first for better layer caching — dependency installs only re-run
# when a package.json actually changes, not on every source edit.
COPY package.json ./
COPY frontend/package.json frontend/package.json
COPY x402-gateway/package.json x402-gateway/package.json
COPY mcp-server/package.json mcp-server/package.json
COPY cctp/package.json cctp/package.json
COPY agent-skill/package.json agent-skill/package.json
COPY contracts/package.json contracts/package.json

RUN npm install

# Now bring in the rest of the source and build every runtime service. Order matters:
# agent-skill must be built before the frontend, which imports its compiled output.
COPY . .

# NEXT_PUBLIC_* vars get baked into the client bundle at build time, not read at container
# runtime — so they must come in as build args, not just regular env vars. Set matching values
# as Environment Variables in Render's dashboard; Render passes these through as Docker build
# args automatically for Dockerfile-based deploys.
ARG NEXT_PUBLIC_X402_GATEWAY_URL=http://localhost:4021
ARG NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:7420
ARG NEXT_PUBLIC_INJECTIVE_EVM_RPC_URL
ARG NEXT_PUBLIC_INJECTIVE_EVM_CHAIN_ID=1439
ARG NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

ENV NEXT_PUBLIC_X402_GATEWAY_URL=$NEXT_PUBLIC_X402_GATEWAY_URL \
    NEXT_PUBLIC_MCP_SERVER_URL=$NEXT_PUBLIC_MCP_SERVER_URL \
    NEXT_PUBLIC_INJECTIVE_EVM_RPC_URL=$NEXT_PUBLIC_INJECTIVE_EVM_RPC_URL \
    NEXT_PUBLIC_INJECTIVE_EVM_CHAIN_ID=$NEXT_PUBLIC_INJECTIVE_EVM_CHAIN_ID \
    NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS=$NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS \
    NEXT_PUBLIC_INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS=$NEXT_PUBLIC_INJECTIVE_MESSAGE_TRANSMITTER_ADDRESS \
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

RUN npm run build

# Drop devDependencies (typescript, tsx, hardhat, etc.) now that everything is compiled —
# they're not needed to actually run the built output.
RUN npm prune --omit=dev

# ── Production image ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache curl
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Shared, hoisted node_modules (npm workspaces put most deps here) + root manifest.
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Each service's compiled output + its own package.json (for any non-hoisted deps).
COPY --from=builder --chown=nodejs:nodejs /app/agent-skill/dist ./agent-skill/dist
COPY --from=builder --chown=nodejs:nodejs /app/agent-skill/package.json ./agent-skill/package.json

COPY --from=builder --chown=nodejs:nodejs /app/x402-gateway/dist ./x402-gateway/dist
COPY --from=builder --chown=nodejs:nodejs /app/x402-gateway/package.json ./x402-gateway/package.json

COPY --from=builder --chown=nodejs:nodejs /app/mcp-server/dist ./mcp-server/dist
COPY --from=builder --chown=nodejs:nodejs /app/mcp-server/package.json ./mcp-server/package.json

COPY --from=builder --chown=nodejs:nodejs /app/cctp/dist ./cctp/dist
COPY --from=builder --chown=nodejs:nodejs /app/cctp/package.json ./cctp/package.json

COPY --from=builder --chown=nodejs:nodejs /app/frontend/.next ./frontend/.next
COPY --from=builder --chown=nodejs:nodejs /app/frontend/public ./frontend/public
COPY --from=builder --chown=nodejs:nodejs /app/frontend/package.json ./frontend/package.json
COPY --from=builder --chown=nodejs:nodejs /app/frontend/next.config.js ./frontend/next.config.js

COPY --chown=nodejs:nodejs start.sh ./start.sh
RUN chmod +x ./start.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV X402_GATEWAY_PORT=4021
ENV MCP_SERVER_PORT=7420
ENV CCTP_WORKER_PORT=4030
# Internal service-to-service URLs — all localhost since everything runs in this one container.
ENV X402_GATEWAY_URL=http://localhost:4021
ENV CCTP_WORKER_URL=http://localhost:4030
ENV NEXT_PUBLIC_X402_GATEWAY_URL=http://localhost:4021
ENV NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:7420

USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

EXPOSE 8080

CMD ["./start.sh"]
