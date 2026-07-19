/**
 * Diagnostic: confirms the real EIP-712 domain fields for Injective testnet's USDC contract,
 * so x402's transferWithAuthorization signatures actually match what the token verifies against.
 *
 * Run from the `cctp` workspace (it already has `ethers` installed):
 *   node check-usdc-domain.js
 */
const { ethers } = require("ethers");

const INJECTIVE_TESTNET_RPC = "https://k8s.testnet.json-rpc.injective.network";
const USDC_ADDRESS = "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d";

const ABI = [
  "function name() external view returns (string)",
  "function version() external view returns (string)",
  "function DOMAIN_SEPARATOR() external view returns (bytes32)",
  "function eip712Domain() external view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(INJECTIVE_TESTNET_RPC);
  const contract = new ethers.Contract(USDC_ADDRESS, ABI, provider);

  console.log("Querying", USDC_ADDRESS, "on Injective testnet...\n");

  try {
    console.log("name():", await contract.name());
  } catch (e) {
    console.log("name(): call failed —", e.message);
  }

  try {
    console.log("version():", await contract.version());
  } catch (e) {
    console.log("version(): not exposed or call failed —", e.message);
  }

  try {
    const domain = await contract.eip712Domain();
    console.log("\neip712Domain() — the authoritative answer if this call succeeds:");
    console.log("  name:", domain.name);
    console.log("  version:", domain.version);
    console.log("  chainId:", domain.chainId.toString());
    console.log("  verifyingContract:", domain.verifyingContract);
  } catch (e) {
    console.log("\neip712Domain(): not exposed (older FiatTokenV2 contracts often lack this) —", e.message);
  }

  try {
    const separator = await contract.DOMAIN_SEPARATOR();
    console.log("\nDOMAIN_SEPARATOR() (for cross-check, not directly usable but confirms the contract computes one):", separator);
  } catch (e) {
    console.log("\nDOMAIN_SEPARATOR(): call failed —", e.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
