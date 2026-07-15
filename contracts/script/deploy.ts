/**
 * Deploys PredictionMarket to Injective's EVM (inEVM) network.
 *
 * Usage:
 *   npx ts-node script/deploy.ts
 *
 * Requires DEPLOYER_PRIVATE_KEY and INJECTIVE_EVM_RPC_URL in .env.
 */
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  const rpcUrl = process.env.INJECTIVE_EVM_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("Missing INJECTIVE_EVM_RPC_URL or DEPLOYER_PRIVATE_KEY in .env");
  }

  const artifactPath = path.resolve(__dirname, "../out/PredictionMarket.sol/PredictionMarket.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run "forge build" first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deploying PredictionMarket from ${wallet.address} to ${rpcUrl} ...`);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(wallet.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`PredictionMarket deployed at: ${address}`);
  console.log(`Set PREDICTION_MARKET_CONTRACT_ADDRESS=${address} in your .env`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
