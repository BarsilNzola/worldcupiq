import express, { type NextFunction, type Request, type Response } from "express";
import * as dotenv from "dotenv";
import { verifyPayment, settlePayment } from "./verify";
import type { AnalyticsReport, X402PaymentPayload, X402PaymentRequirements } from "./types";
import { generatePremiumReport } from "./reportGenerator";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = Number(process.env.X402_GATEWAY_PORT ?? 4021);
const PRICE_USDC = process.env.X402_PRICE_PER_REPORT_USDC ?? "0.01";
const PAY_TO = process.env.X402_RECEIVING_ADDRESS ?? "0x0000000000000000000000000000000000000000";
const USDC_ASSET = process.env.USDC_CONTRACT_ADDRESS_INJECTIVE ?? "0x0000000000000000000000000000000000000000";

function usdcToAtomicUnits(amount: string): string {
  // USDC has 6 decimals.
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = (fraction + "000000").slice(0, 6);
  return (BigInt(whole) * 1_000_000n + BigInt(paddedFraction || "0")).toString();
}

function buildRequirements(resource: string): X402PaymentRequirements {
  return {
    scheme: "exact",
    network: "injective",
    maxAmountRequired: usdcToAtomicUnits(PRICE_USDC),
    resource,
    description: `WorldCupIQ premium analytics report: ${resource}`,
    mimeType: "application/json",
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    asset: USDC_ASSET,
  };
}

/**
 * x402 middleware: any route wrapped by this returns HTTP 402 with payment requirements
 * unless a valid X-PAYMENT header is present, in which case it verifies + settles the
 * payment before letting the request through. This is the core of the "pay-per-call"
 * micropayment model — no subscriptions, no API keys, just a signed authorization per call.
 */
function requirePayment(resourcePath: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const requirements = buildRequirements(resourcePath(req));
    const paymentHeader = req.header("X-PAYMENT");

    if (!paymentHeader) {
      return res.status(402).json({
        x402Version: 1,
        error: "payment_required",
        accepts: [requirements],
      });
    }

    let payload: X402PaymentPayload;
    try {
      payload = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"));
    } catch {
      return res.status(400).json({ error: "malformed_payment_header" });
    }

    const verification = await verifyPayment(payload, requirements);
    if (!verification.isValid) {
      return res.status(402).json({
        x402Version: 1,
        error: "invalid_payment",
        reason: verification.invalidReason,
        accepts: [requirements],
      });
    }

    const settlement = await settlePayment(payload, requirements);
    if (!settlement.success) {
      return res.status(402).json({
        x402Version: 1,
        error: "settlement_failed",
        reason: settlement.errorReason,
        accepts: [requirements],
      });
    }

    res.setHeader(
      "X-PAYMENT-RESPONSE",
      Buffer.from(JSON.stringify({ success: true, txHash: settlement.txHash })).toString("base64")
    );
    (req as Request & { settlementTxHash?: string }).settlementTxHash = settlement.txHash;
    next();
  };
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

/**
 * GET /analytics/:matchId — free preview (no payment required).
 */
app.get("/analytics/:matchId", async (req, res) => {
  const report = await generatePremiumReport(req.params.matchId, "free");
  res.json(report);
});

/**
 * GET /analytics/:matchId/premium — the paid "Deep Report" endpoint. Gated by x402.
 */
app.get(
  "/analytics/:matchId/premium",
  requirePayment((req) => `/analytics/${req.params.matchId}/premium`),
  async (req: Request & { settlementTxHash?: string }, res: Response) => {
    const report: AnalyticsReport = await generatePremiumReport(req.params.matchId, "premium");
    res.json({ ...report, paymentTxHash: req.settlementTxHash });
  }
);

app.listen(PORT, () => {
  console.log(`x402 gateway listening on :${PORT}`);
  console.log(`Price per premium report: ${PRICE_USDC} USDC, payable to ${PAY_TO}`);
});

export { app };
