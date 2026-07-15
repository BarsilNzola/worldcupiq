export interface ChainConfig {
  name: string;
  cctpDomain: number;
  usdcAddress: string;
  tokenMessengerAddress: string;
  messageTransmitterAddress: string;
  rpcUrlEnvVar: string;
}

/**
 * Circle CCTP V2 domain IDs. Injective is domain 29. Source chain addresses below are
 * placeholders — replace with the current Circle-published contract addresses for the
 * target environment (sandbox vs mainnet) before going live.
 * Reference: https://developers.circle.com/stablecoins/evm-smart-contracts
 */
export const SUPPORTED_SOURCE_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum Sepolia",
    cctpDomain: 0,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessengerAddress: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitterAddress: "0x7865fAfC2db2093669d92c0F0A9d3E39d4Bee83B0",
    rpcUrlEnvVar: "ETH_RPC_URL",
  },
  base: {
    name: "Base Sepolia",
    cctpDomain: 6,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessengerAddress: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitterAddress: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
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

export const INJECTIVE_DESTINATION = {
  name: "Injective",
  cctpDomain: Number(process.env.CCTP_DESTINATION_DOMAIN_INJECTIVE ?? 29),
  usdcAddress: process.env.USDC_CONTRACT_ADDRESS_INJECTIVE ?? "0x0000000000000000000000000000000000000000",
};

export const CIRCLE_API_BASE_URL = process.env.CIRCLE_API_BASE_URL ?? "https://iris-api-sandbox.circle.com";
