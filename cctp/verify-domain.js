/**
 * Confirms {name: "USDC", version: "2"} actually produces the on-chain DOMAIN_SEPARATOR we
 * already fetched, before trusting it for a real signed payment.
 *
 * Run from the `cctp` workspace:
 *   node verify-domain.js
 */
const { ethers } = require("ethers");

const USDC_ADDRESS = "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d";
const CHAIN_ID = 1439;
const ON_CHAIN_DOMAIN_SEPARATOR = "0x1be608619e63c5c161c99fc0aa20e10608108d4afbe66a75fed7a9428cf07bf5";

const domain = {
  name: "USDC",
  version: "2",
  chainId: CHAIN_ID,
  verifyingContract: USDC_ADDRESS,
};

const computed = ethers.TypedDataEncoder.hashDomain(domain);

console.log("Computed domain separator:", computed);
console.log("On-chain domain separator:", ON_CHAIN_DOMAIN_SEPARATOR);
console.log(
  computed.toLowerCase() === ON_CHAIN_DOMAIN_SEPARATOR.toLowerCase()
    ? "\n✅ MATCH — {name: 'USDC', version: '2'} is confirmed correct."
    : "\n❌ MISMATCH — something else is still wrong, do not trust this domain yet."
);
