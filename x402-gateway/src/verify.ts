import { ethers } from "ethers";
import type { X402PaymentPayload, X402PaymentRequirements, X402SettleResult, X402VerifyResult } from "./types";

/**
 * Verifies an x402 EIP-3009 "transferWithAuthorization" payment payload against the
 * requirements the gateway advertised in its 402 response.
 *
 * This performs local structural + signature checks. In production this call is normally
 * delegated to a facilitator (X402_FACILITATOR_URL) that also checks on-chain balance/nonce
 * state; we show both paths and default to the facilitator when configured.
 */
export async function verifyPayment(
  payload: X402PaymentPayload,
  requirements: X402PaymentRequirements
): Promise<X402VerifyResult> {
  const { authorization, signature } = payload.payload;

  if (payload.network !== requirements.network) {
    return { isValid: false, invalidReason: "network_mismatch" };
  }

  if (authorization.to.toLowerCase() !== requirements.payTo.toLowerCase()) {
    return { isValid: false, invalidReason: "incorrect_recipient" };
  }

  if (BigInt(authorization.value) < BigInt(requirements.maxAmountRequired)) {
    return { isValid: false, invalidReason: "insufficient_amount" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds < Number(authorization.validAfter) || nowSeconds > Number(authorization.validBefore)) {
    return { isValid: false, invalidReason: "authorization_expired_or_not_yet_valid" };
  }

  const domain = {
    name: "USDC", // confirmed via name() call against the real testnet contract
    version: "2",
    chainId: Number(process.env.INJECTIVE_EVM_CHAIN_ID ?? 1439),
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

  try {
    const recovered = ethers.verifyTypedData(domain, types, authorization, signature);
    if (recovered.toLowerCase() !== authorization.from.toLowerCase()) {
      return { isValid: false, invalidReason: "signature_does_not_match_sender" };
    }
  } catch (err) {
    return { isValid: false, invalidReason: "malformed_signature" };
  }

  return { isValid: true };
}

/**
 * Settles a verified payment on-chain by relaying the signed authorization to the USDC
 * contract's transferWithAuthorization function, gasless for the payer (the gateway/facilitator
 * covers gas). Falls back to a configured facilitator endpoint if provided.
 */
export async function settlePayment(
  payload: X402PaymentPayload,
  requirements: X402PaymentRequirements
): Promise<X402SettleResult> {
  const facilitatorUrl = process.env.X402_FACILITATOR_URL;

  if (facilitatorUrl) {
    try {
      const res = await fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentPayload: payload, paymentRequirements: requirements }),
      });
      const data = (await res.json()) as X402SettleResult;
      if (!data.success) {
        console.error(`[verify] Facilitator settlement failed: ${data.errorReason}`);
      }
      return data;
    } catch (err) {
      console.error(`[verify] Facilitator unreachable: ${(err as Error).message}`);
      return { success: false, errorReason: `facilitator_unreachable: ${(err as Error).message}` };
    }
  }

  // Direct settlement path (self-hosted facilitator): relay the authorization to the USDC
  // contract on Injective ourselves using a funded relayer key.
  try {
    const rpcUrl = process.env.INJECTIVE_EVM_RPC_URL;
    const relayerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!rpcUrl || !relayerKey) {
      return { success: false, errorReason: "relayer_not_configured" };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayer = new ethers.Wallet(relayerKey, provider);

    const usdcAbi = [
      "function transferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,bytes signature) external",
    ];
    const usdc = new ethers.Contract(requirements.asset, usdcAbi, relayer);
    const { authorization, signature } = payload.payload;

    const tx = await usdc.transferWithAuthorization(
      authorization.from,
      authorization.to,
      authorization.value,
      authorization.validAfter,
      authorization.validBefore,
      authorization.nonce,
      signature
    );
    const receipt = await tx.wait();

    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error(`[verify] Direct settlement failed: ${(err as Error).message}`);
    return { success: false, errorReason: (err as Error).message };
  }
}
