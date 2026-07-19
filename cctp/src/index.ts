import express from "express";
import * as dotenv from "dotenv";
import * as path from "path";
import { bridgeUsdcToInjective, pollForAttestation } from "./bridge";
import type { BridgeRequest } from "./types";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
app.use(express.json());

const PORT = Number(process.env.CCTP_WORKER_PORT ?? 4030);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

/**
 * GET /attestation?txHash=X&sourceDomain=Y — polls Circle's Iris API for the attestation
 * matching a burn transaction. No private key involved at all: this is a pure read against
 * Circle's public attestation service, used by the wallet-signed browser bridge flow (the
 * wallet signs burn/mint directly; this is the one piece that still needs a backend, purely
 * to keep CIRCLE_API_KEY out of client-side code).
 */
app.get("/attestation", async (req, res) => {
  const { txHash, sourceDomain } = req.query as { txHash?: string; sourceDomain?: string };

  if (!txHash || !sourceDomain) {
    return res.status(400).json({ error: "txHash and sourceDomain query params are required" });
  }

  try {
    const result = await pollForAttestation(txHash, Number(sourceDomain));
    res.json(result); // { attestation, message } — message is Circle's own authoritative copy
  } catch (err) {
    res.status(504).json({ error: (err as Error).message });
  }
});

/**
 * POST /bridge — the original server-signed path (accepts a raw private key), kept for
 * non-browser callers such as an autonomous agent's own automated top-ups. Browser users should
 * prefer the wallet-signed flow driven by frontend/lib/cctp.ts + the /attestation endpoint above.
 *
 * NOTE: accepting a raw private key over HTTP is for local/demo/agent use only.
 */
app.post("/bridge", async (req, res) => {
  const { signerPrivateKey, ...request } = req.body as BridgeRequest & { signerPrivateKey: string };

  if (!signerPrivateKey) {
    return res.status(400).json({ error: "missing_signer_private_key" });
  }

  try {
    const result = await bridgeUsdcToInjective(request, signerPrivateKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => console.log(`CCTP bridge worker listening on :${PORT}`));

export { app };
