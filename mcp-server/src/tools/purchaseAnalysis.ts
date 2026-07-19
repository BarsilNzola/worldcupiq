import { z } from "zod";
import { ethers } from "ethers";
import { randomBytes } from "crypto";

export const purchaseAnalysisSchema = {
  name: "purchase_analysis",
  description:
    "Purchases the full premium analytics report for a match by autonomously paying 0.01 USDC via the " +
    "x402 protocol on Injective. This is the tool an AI agent uses to unlock the deep tactical report " +
    "get_match_analytics only previews. Requires the agent to hold USDC on Injective (use the CCTP bridge " +
    "tool to top up first if the payment fails with insufficient_amount).",
  inputSchema: {
    matchId: z.string().describe("The match identifier as returned by get_fixtures (numeric when live, slug-style when running on the fallback snapshot)"),
  },
};

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
 * Signs an EIP-3009 transferWithAuthorization payload for the exact amount requested, using the
 * agent's own configured wallet key. This is what lets an AI agent transact completely
 * autonomously, no browser wallet popup, no human in the loop.
 */
async function signPaymentAuthorization(requirements: X402Requirements, agentPrivateKey: string) {
  const wallet = new ethers.Wallet(agentPrivateKey);

  const validAfter = "0";
  const validBefore = String(Math.floor(Date.now() / 1000) + requirements.maxTimeoutSeconds);
  const nonce = ethers.hexlify(randomBytes(32));

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

  const authorization = {
    from: wallet.address,
    to: requirements.payTo,
    value: requirements.maxAmountRequired,
    validAfter,
    validBefore,
    nonce,
  };

  const signature = await wallet.signTypedData(domain, types, authorization);

  return {
    x402Version: 1,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: { signature, authorization },
  };
}

export async function purchaseAnalysis(input: { matchId: string }) {
  const agentPrivateKey = process.env.AGENT_WALLET_PRIVATE_KEY;
  if (!agentPrivateKey) {
    return { error: "AGENT_WALLET_PRIVATE_KEY not configured for this MCP server instance" };
  }

  const gatewayUrl = process.env.X402_GATEWAY_URL ?? "http://localhost:4021";
  const resourceUrl = `${gatewayUrl}/analytics/${input.matchId}/premium`;

  // Step 1: probe the resource without payment to get the 402 + requirements.
  const probe = await fetch(resourceUrl);
  if (probe.status !== 402) {
    // Either already paid-for in some cached sense, or an error — return whatever we got.
    return await probe.json();
  }

  const { accepts } = (await probe.json()) as { accepts: X402Requirements[] };
  const requirements = accepts[0];

  // Step 2: sign the payment authorization with the agent's own wallet.
  const paymentPayload = await signPaymentAuthorization(requirements, agentPrivateKey);
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

  // Step 3: retry the request with the X-PAYMENT header attached.
  const paidResponse = await fetch(resourceUrl, {
    headers: { "X-PAYMENT": paymentHeader },
  });

  if (!paidResponse.ok) {
    const errorBody = await paidResponse.json().catch(() => ({}));
    return { error: "purchase_failed", status: paidResponse.status, details: errorBody };
  }

  const report = await paidResponse.json();
  return { purchased: true, pricePaidUsdc: "0.01", report };
}
