"use client";

import { useCallback, useState } from "react";
import { ethers } from "ethers";
import type { AnalyticsReport } from "../lib/types";

interface X402Requirements {
  scheme: "exact";
  network: "injective";
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

/**
 * Drives the browser-side x402 flow: request the resource, receive HTTP 402 + payment
 * requirements, have the connected wallet sign an EIP-3009 transferWithAuthorization message
 * (no gas, no on-chain tx from the user), then retry the request with the signed payload
 * attached as the X-PAYMENT header.
 */
export function useX402(provider: ethers.BrowserProvider | null) {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockPremiumReport = useCallback(
    async (matchId: string) => {
      if (!provider) {
        setError("Connect your wallet first.");
        return;
      }

      setPaying(true);
      setError(null);
      try {
        const resourceUrl = `/api/analytics/${matchId}/premium`;

        const probe = await fetch(resourceUrl);
        if (probe.status !== 402) {
          const data = (await probe.json()) as AnalyticsReport;
          setReport(data);
          return data;
        }

        const { accepts } = (await probe.json()) as { accepts: X402Requirements[] };
        const requirements = accepts[0];

        const signer = await provider.getSigner();
        const from = await signer.getAddress();

        const validAfter = "0";
        const validBefore = String(Math.floor(Date.now() / 1000) + requirements.maxTimeoutSeconds);
        const nonce = ethers.hexlify(ethers.randomBytes(32));

        const domain = {
          name: "USDC", // confirmed via name() call against the real testnet contract
          version: "2",
          chainId: (await provider.getNetwork()).chainId,
          verifyingContract: requirements.asset,
        };

        const types = {
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        };

        const authorization = { from, to: requirements.payTo, value: requirements.maxAmountRequired, validAfter, validBefore, nonce };
        const signature = await signer.signTypedData(domain, types, authorization);

        const paymentPayload = {
          x402Version: 1,
          scheme: requirements.scheme,
          network: requirements.network,
          payload: { signature, authorization },
        };
        const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

        const paidResponse = await fetch(resourceUrl, { headers: { "X-PAYMENT": paymentHeader } });
        if (!paidResponse.ok) {
          const body = await paidResponse.json().catch(() => ({}));
          throw new Error(body.reason ?? `Payment failed with status ${paidResponse.status}`);
        }

        const data = (await paidResponse.json()) as AnalyticsReport;
        setReport(data);
        return data;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setPaying(false);
      }
    },
    [provider]
  );

  return { unlockPremiumReport, report, paying, error };
}
