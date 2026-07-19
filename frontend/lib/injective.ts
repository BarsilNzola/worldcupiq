import { ethers } from "ethers";
import { INJECTIVE_EVM_CHAIN } from "./constants";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const PREDICTION_MARKET_ABI = [
  "function submitPrediction(bytes32 matchId, string homeTeam, string awayTeam, uint64 kickoffTimestamp, uint8 pick) external",
  "function getLeaderboardScore(address predictor) external view returns (uint256)",
];

/**
 * Prompts the connected wallet to switch to the given chain, adding it first if the wallet
 * doesn't already know about it. Reusable across Injective and any CCTP source chain.
 */
export async function switchOrAddChain(chain: {
  chainIdHex: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  blockExplorerUrl?: string;
}): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chain.chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chain.chainIdHex,
            chainName: chain.chainName,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: chain.blockExplorerUrl ? [chain.blockExplorerUrl] : undefined,
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/** Prompts the browser wallet to connect and, if needed, add/switch to the Injective EVM network. */
export async function connectInjectiveWallet(): Promise<{ address: string; provider: ethers.BrowserProvider }> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  await switchOrAddChain({
    chainIdHex: INJECTIVE_EVM_CHAIN.chainIdHex,
    chainName: INJECTIVE_EVM_CHAIN.chainName,
    nativeCurrency: INJECTIVE_EVM_CHAIN.nativeCurrency,
    rpcUrl: process.env.NEXT_PUBLIC_INJECTIVE_EVM_RPC_URL ?? "",
  });

  const signer = await provider.getSigner();
  return { address: await signer.getAddress(), provider };
}

export function getPredictionMarketContract(provider: ethers.BrowserProvider, contractAddress: string) {
  return provider.getSigner().then((signer) => new ethers.Contract(contractAddress, PREDICTION_MARKET_ABI, signer));
}

export function matchIdToBytes32(matchId: string): string {
  return ethers.id(matchId);
}
