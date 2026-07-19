export interface ChainConfig {
  name: string;
  cctpDomain: number;
  usdcAddress: string;
  tokenMessengerAddress: string;
  messageTransmitterAddress: string;
  rpcUrlEnvVar: string;
}

/**
 * Circle CCTP V2 domain IDs — verified against Circle's official docs (domain 29 = Injective,
 * domain 6 = Base, domain 0 = Ethereum: https://developers.circle.com/cctp/concepts/supported-chains-and-domains).
 *
 * TokenMessengerV2 and MessageTransmitterV2 addresses below are the TESTNET addresses, sourced
 * directly from Circle's official contract-addresses reference:
 *   https://developers.circle.com/cctp/evm/contract-addresses
 * IMPORTANT: testnet and mainnet use DIFFERENT addresses for the same contracts — don't cross
 * reference one against the other. These testnet addresses are identical across every testnet
 * domain (Ethereum Sepolia, Base Sepolia, Injective Testnet, etc.), per Circle's own table.
 */
const EVM_TOKEN_MESSENGER_V2_TESTNET = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
const EVM_MESSAGE_TRANSMITTER_V2_TESTNET = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";

export const SUPPORTED_SOURCE_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum Sepolia",
    cctpDomain: 0,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessengerAddress: EVM_TOKEN_MESSENGER_V2_TESTNET,
    messageTransmitterAddress: EVM_MESSAGE_TRANSMITTER_V2_TESTNET,
    rpcUrlEnvVar: "ETH_RPC_URL",
  },
  base: {
    name: "Base Sepolia",
    cctpDomain: 6,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessengerAddress: EVM_TOKEN_MESSENGER_V2_TESTNET,
    messageTransmitterAddress: EVM_MESSAGE_TRANSMITTER_V2_TESTNET,
    rpcUrlEnvVar: "BASE_RPC_URL",
  },
  solana: {
    name: "Solana Devnet",
    cctpDomain: 5,
    usdcAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    tokenMessengerAddress: "CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3",
    messageTransmitterAddress: "CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd",
    rpcUrlEnvVar: "SOLANA_RPC_URL",
  },
};

export function getInjectiveDestination() {
  return {
    name: "Injective",
    cctpDomain: Number(process.env.CCTP_DESTINATION_DOMAIN_INJECTIVE ?? 29),
    usdcAddress: process.env.USDC_CONTRACT_ADDRESS_INJECTIVE ?? "0x0000000000000000000000000000000000000000",
  };
}

export function getCircleApiBaseUrl(): string {
  return process.env.CIRCLE_API_BASE_URL ?? "https://iris-api-sandbox.circle.com";
}
