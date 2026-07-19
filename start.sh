#!/bin/sh
# Starts all four WorldCupIQ services inside a single container.
# Only the frontend's port is exposed publicly (Render's $PORT); the gateway, MCP server, and
# CCTP worker are internal-only, reached by the frontend over localhost.
set -e

echo "[start.sh] Starting x402 gateway on :${X402_GATEWAY_PORT:-4021}..."
node /app/x402-gateway/dist/gateway.js &

echo "[start.sh] Starting MCP server on :${MCP_SERVER_PORT:-7420}..."
node /app/mcp-server/dist/server.js &

echo "[start.sh] Starting CCTP worker on :${CCTP_WORKER_PORT:-4030}..."
node /app/cctp/dist/index.js &

# Give the internal services a moment to bind their ports before the frontend starts proxying to them.
sleep 2

echo "[start.sh] Starting frontend on :${PORT:-8080}..."
cd /app/frontend
exec /app/node_modules/.bin/next start -p "${PORT:-8080}"
