"use client";

import { useCallback, useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import { agentKeyMessage } from "@hoodwire/sdk";

const storageKey = (address: string) => `hoodwire.agentKey.${address.toLowerCase()}`;

/**
 * The agent key for the connected wallet, kept in localStorage.
 *
 * The key is what tells the gateway whose escrow to charge, so it is per-wallet and only
 * obtainable by signing — which is why nothing here can spend someone else's balance.
 */
export function useAgentKey(address: `0x${string}` | undefined) {
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (!address) return setKey(null);
    try {
      setKey(window.localStorage.getItem(storageKey(address)));
    } catch {
      setKey(null);
    }
  }, [address]);

  const create = useCallback(async () => {
    if (!address || busy) return;
    setBusy(true);
    setError(null);
    try {
      const issuedAt = Date.now();
      const signature = await signMessageAsync({ message: agentKeyMessage(address, issuedAt) });
      const res = await fetch("/api/agent-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, signature, issuedAt }),
      });
      const data = (await res.json()) as { key?: string; detail?: string; error?: string };
      if (!res.ok || !data.key) throw new Error(data.detail ?? data.error ?? res.statusText);
      try {
        window.localStorage.setItem(storageKey(address), data.key);
      } catch {
        /* private mode — the key still works for this session */
      }
      setKey(data.key);
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setError(msg.includes("User rejected") ? "Signature rejected" : msg);
    } finally {
      setBusy(false);
    }
  }, [address, busy, signMessageAsync]);

  const forget = useCallback(() => {
    if (!address) return;
    try {
      window.localStorage.removeItem(storageKey(address));
    } catch {
      /* ignore */
    }
    setKey(null);
  }, [address]);

  return { key, create, forget, busy, error };
}
