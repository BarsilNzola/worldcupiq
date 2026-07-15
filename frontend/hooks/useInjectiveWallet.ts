"use client";

import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { connectInjectiveWallet } from "../lib/injective";

export function useInjectiveWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectInjectiveWallet();
      setAddress(result.address);
      setProvider(result.provider);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
  }, []);

  return { address, provider, connecting, error, connect, disconnect };
}
