import { ethers } from "hardhat";

/**
 * Deploys PredictionMarket to whichever network Hardhat is pointed at.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network injective_testnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No signer available — check DEPLOYER_PRIVATE_KEY in your .env");
  }

  console.log(`Deploying PredictionMarket from ${deployer.address} ...`);

  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const contract = await PredictionMarket.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`PredictionMarket deployed at: ${address}`);
  console.log(`Set PREDICTION_MARKET_CONTRACT_ADDRESS=${address} in your .env`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
