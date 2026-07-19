export const X402_GATEWAY_URL = process.env.NEXT_PUBLIC_X402_GATEWAY_URL ?? "http://localhost:4021";
export const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "http://localhost:7420";

export const PREMIUM_REPORT_PRICE_USDC = "0.01";

export const INJECTIVE_EVM_CHAIN = {
  chainIdHex: "0x59F", // 1439 decimal — Injective EVM Testnet's real chain ID
  chainName: "Injective EVM Testnet",
  nativeCurrency: { name: "INJ", symbol: "INJ", decimals: 18 },
};
