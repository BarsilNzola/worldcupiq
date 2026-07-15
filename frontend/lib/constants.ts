export const X402_GATEWAY_URL = process.env.NEXT_PUBLIC_X402_GATEWAY_URL ?? "http://localhost:4021";
export const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "http://localhost:7420";

export const SOURCE_CHAINS = [
  { id: "ethereum", label: "Ethereum" },
  { id: "base", label: "Base" },
  { id: "solana", label: "Solana" },
] as const;

export const PREMIUM_REPORT_PRICE_USDC = "0.01";

export const INJECTIVE_EVM_CHAIN = {
  chainIdHex: "0x2F", // placeholder inEVM chain id — replace with the real deployed chain id
  chainName: "Injective (inEVM)",
  nativeCurrency: { name: "INJ", symbol: "INJ", decimals: 18 },
};
