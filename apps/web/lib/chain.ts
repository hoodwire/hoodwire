import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain, http } from "viem";

/** Deployed contract set, written by `npm run chain:dev` into addresses.local.json. */
export interface LocalChain {
  chainId: number;
  rpcUrl: string;
  operator: `0x${string}`;
  usdg: `0x${string}`;
  reputation: `0x${string}`;
  vendorRegistry: `0x${string}`;
  settlementEscrow: `0x${string}`;
}

const FALLBACK_RPC = "http://127.0.0.1:8545";
const FALLBACK_ID = 31337;

/** Build a viem/wagmi chain for the local anvil node (defaults to 31337 @ 8545). */
export function anvilChain(local: LocalChain | null) {
  const id = local?.chainId ?? FALLBACK_ID;
  const rpc = local?.rpcUrl ?? FALLBACK_RPC;
  return defineChain({
    id,
    name: "Anvil · Hoodwire local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  });
}

/**
 * wagmi config for the dashboard. Always registers the injected connector so
 * "Connect wallet" works even before contracts are deployed.
 */
export function makeConfig(local: LocalChain | null) {
  const chain = anvilChain(local);
  return createConfig({
    chains: [chain],
    connectors: [injected()],
    transports: { [chain.id]: http(local?.rpcUrl ?? FALLBACK_RPC) },
    ssr: true,
  });
}

/** USDG is a 6-decimal stablecoin across the whole system. */
export const USDG_DECIMALS = 6;
