import * as dotenv from "dotenv";
import { WorldCupAnalyst } from "./WorldCupAnalyst";

dotenv.config({ path: "../.env" });

async function main() {
  const mcpUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "http://localhost:7420/mcp";
  const analyst = new WorldCupAnalyst(mcpUrl);

  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY;
  const rpcUrl = process.env.INJECTIVE_EVM_RPC_URL;
  const contractAddress = process.env.PREDICTION_MARKET_CONTRACT_ADDRESS;

  if (privateKey && rpcUrl && contractAddress) {
    analyst.connectWallet(privateKey, rpcUrl, contractAddress);
  } else {
    console.warn("Wallet env vars missing — running evaluation only, on-chain submission will be skipped.");
  }

  const { evaluation, submission } = await analyst.runFullCycle("eng-arg-sf2");

  console.log("=== Evaluation ===");
  console.log(JSON.stringify(evaluation, null, 2));
  console.log("=== Submission ===");
  console.log(JSON.stringify(submission, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
