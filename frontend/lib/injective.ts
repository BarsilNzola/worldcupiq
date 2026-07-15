import { ethers } from "ethers";
import { INJECTIVE_EVM_CHAIN } from "./constants";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const PREDICTION_MARKET_ABI = [
  "function submitPrediction(bytes32 matchId, uint8 pick) external",
  "function getLeaderboardScore(address predictor) external view returns (uint256)",
];

/** Prompts the browser wallet to connect and, if needed, add/switch to the Injective inEVM network. */
export async function connectInjectiveWallet(): Promise<{ address: string; provider: ethers.BrowserProvider }> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: INJECTIVE_EVM_CHAIN.chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: INJECTIVE_EVM_CHAIN.chainIdHex,
            chainName: INJECTIVE_EVM_CHAIN.chainName,
            nativeCurrency: INJECTIVE_EVM_CHAIN.nativeCurrency,
            rpcUrls: [process.env.NEXT_PUBLIC_INJECTIVE_EVM_RPC_URL ?? ""],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }

  const signer = await provider.getSigner();
  return { address: await signer.getAddress(), provider };
}

export function getPredictionMarketContract(provider: ethers.BrowserProvider, contractAddress: string) {
  return provider.getSigner().then((signer) => new ethers.Contract(contractAddress, PREDICTION_MARKET_ABI, signer));
}

export function matchIdToBytes32(matchId: string): string {
  return ethers.id(matchId);
}
