import express from "express";
import * as dotenv from "dotenv";
import { bridgeUsdcToInjective } from "./bridge";
import type { BridgeRequest } from "./types";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = Number(process.env.CCTP_WORKER_PORT ?? 4030);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

/**
 * POST /bridge
 * body: { sourceChain, amountUsdc, recipientInjectiveAddress, signerPrivateKey, isAgentInitiated? }
 *
 * NOTE: accepting a raw private key over HTTP is for local/demo use only. In production the
 * signature should be produced client-side (browser wallet or agent's own key) and only the
 * signed transaction / calldata sent to this service.
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
