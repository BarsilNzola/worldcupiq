"use client";

import { useCallback, useState } from "react";
import type { BridgeStep } from "../lib/types";
import { burnUsdcOnSourceChain, mintUsdcOnInjective, SOURCE_CHAIN_CONFIGS } from "../lib/cctp";

interface BridgeParams {
  sourceChain: "ethereum" | "base";
  amountUsdc: string;
  recipientInjectiveAddress: string;
}

/**
 * Drives the full CCTP bridge with the connected wallet signing every transaction directly —
 * burn on the source chain, then mint on Injective. No private key is ever sent anywhere; the
 * only backend call is a read-only attestation poll (which needs CIRCLE_API_KEY server-side,
 * but touches no funds and requires no signature).
 */
export function useCCTP() {
  const [steps, setSteps] = useState<BridgeStep[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [bridging, setBridging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);

  const bridge = useCallback(async (params: BridgeParams) => {
    setBridging(true);
    setError(null);
    setMintTxHash(null);
    setSteps([
      { step: "burn", status: "in_progress" },
      { step: "attest", status: "pending" },
      { step: "mint", status: "pending" },
    ]);

    try {
      // ── Step 1: burn (wallet-signed, on the source chain) ──────────────────
      const { txHash: burnTxHash, messageBytes: ownExtractedMessage } = await burnUsdcOnSourceChain(
        params.sourceChain,
        params.amountUsdc,
        params.recipientInjectiveAddress,
        setStatusMessage
      );
      setSteps((prev) => [
        { step: "burn", status: "complete", txHash: burnTxHash },
        { step: "attest", status: "in_progress" },
        { step: "mint", status: "pending" },
      ]);

      // ── Step 2: attest (read-only backend poll, no key needed) ─────────────
      setStatusMessage("Waiting for Circle's attestation (this can take a minute)…");
      const sourceDomain = SOURCE_CHAIN_CONFIGS[params.sourceChain].cctpDomain;
      const res = await fetch(`/api/payments/attestation?txHash=${burnTxHash}&sourceDomain=${sourceDomain}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Attestation request failed with status ${res.status}`);
      }
      const { attestation, message: circleMessage } = (await res.json()) as {
        attestation: string;
        message: string;
      };

      // Circle's own copy of the message is authoritative — any subtle mismatch between it and
      // our own event-log extraction produces a signature that fails to verify on-chain even
      // when the attesters are configured correctly (surfaces as a confusing "not attester"
      // revert). Log a diagnostic if they differ, but always mint with Circle's copy.
      if (circleMessage && circleMessage.toLowerCase() !== ownExtractedMessage.toLowerCase()) {
        console.warn(
          "[cctp] Own event-log message extraction differs from Circle's authoritative copy — using Circle's."
        );
      }
      const messageBytes = circleMessage ?? ownExtractedMessage;

      setSteps((prev) => [
        { step: "burn", status: "complete", txHash: burnTxHash },
        { step: "attest", status: "complete" },
        { step: "mint", status: "in_progress" },
      ]);

      // ── Step 3: mint (wallet-signed, on Injective) ──────────────────────────
      const mintHash = await mintUsdcOnInjective(messageBytes, attestation, setStatusMessage);
      setSteps([
        { step: "burn", status: "complete", txHash: burnTxHash },
        { step: "attest", status: "complete" },
        { step: "mint", status: "complete", txHash: mintHash },
      ]);
      setMintTxHash(mintHash);
      setStatusMessage("Bridge complete.");
    } catch (err) {
      setError((err as Error).message);
      setSteps((prev) =>
        prev.map((s) => (s.status === "in_progress" ? { ...s, status: "failed" as const } : s))
      );
    } finally {
      setBridging(false);
    }
  }, []);

  return { bridge, bridging, steps, statusMessage, mintTxHash, error };
}
