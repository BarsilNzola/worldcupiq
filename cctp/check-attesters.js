/**
 * Diagnostic script: confirms whether Circle's CCTP V2 sandbox attester keys are actually
 * registered on Injective testnet's MessageTransmitterV2 proxy.
 *
 * Run from the `cctp` workspace (it already has `ethers` installed):
 *   node check-attesters.js
 */
const { ethers } = require("ethers");

const INJECTIVE_TESTNET_RPC = "https://k8s.testnet.json-rpc.injective.network";
const MESSAGE_TRANSMITTER_PROXY = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";

const MESSAGE_TRANSMITTER_ABI = [
  "function isEnabledAttester(address attester) external view returns (bool)",
  "function getNumEnabledAttesters() external view returns (uint256)",
  "function getEnabledAttester(uint256 index) external view returns (address)",
  "function signatureThreshold() external view returns (uint256)",
];

// Circle's published CCTP V2 sandbox public keys (fetched live from
// https://iris-api-sandbox.circle.com/v2/publicKeys, cctpVersion === 2 only).
const CIRCLE_V2_PUBLIC_KEYS = [
  "0x04bea91197b05e88b24dd660a7ae7e4724177da8a150bbd46616d9d5aa1f359e345a6b43234af1df89cfce475e2fab48b7f5fbed71b0273457421ef32b6f31ca5c",
  "0x043ab8156da6402db09667050b9a28d644fb11491567fc8c1f956367ca4b7840b8d2798e1a3170e5d7ef763ed745a477b10dab75c19dedd2f84258c37fd0072386",
];

function publicKeyToAddress(publicKey) {
  const withoutPrefix = "0x" + publicKey.slice(4); // strip the 0x04 uncompressed-key marker
  const hash = ethers.keccak256(withoutPrefix);
  return ethers.getAddress("0x" + hash.slice(-40));
}

async function main() {
  const provider = new ethers.JsonRpcProvider(INJECTIVE_TESTNET_RPC);
  const contract = new ethers.Contract(MESSAGE_TRANSMITTER_PROXY, MESSAGE_TRANSMITTER_ABI, provider);

  console.log("Circle's sandbox CCTP V2 attester addresses (computed from published public keys):");
  const circleAddresses = CIRCLE_V2_PUBLIC_KEYS.map(publicKeyToAddress);
  circleAddresses.forEach((addr) => console.log("  ", addr));

  console.log("\nOn-chain state at", MESSAGE_TRANSMITTER_PROXY, "(Injective testnet):");
  const numAttesters = await contract.getNumEnabledAttesters();
  console.log("  getNumEnabledAttesters():", numAttesters.toString());

  try {
    const threshold = await contract.signatureThreshold();
    console.log("  signatureThreshold():", threshold.toString());
  } catch {
    console.log("  signatureThreshold(): not exposed with this name, skipping");
  }

  const registered = [];
  for (let i = 0; i < Number(numAttesters); i++) {
    const addr = await contract.getEnabledAttester(i);
    registered.push(addr);
    console.log(`  getEnabledAttester(${i}):`, addr);
  }

  console.log("\n=== Verdict ===");
  for (const circleAddr of circleAddresses) {
    const isRegistered = registered.some((r) => r.toLowerCase() === circleAddr.toLowerCase());
    console.log(
      `Circle attester ${circleAddr} is ${isRegistered ? "✅ REGISTERED" : "❌ NOT REGISTERED"} on Injective testnet's MessageTransmitterV2`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
