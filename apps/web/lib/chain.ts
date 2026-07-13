import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain, http, type Chain } from "viem";
import robinhoodDeployment from "@/lib/deployments/robinhood-testnet.json";

/** A deployed contract set on one chain (anvil-local or a public testnet). */
export interface Deployment {
  network: string;
  chainId: number;
  rpcUrl: string;
  explorer?: string;
  operator: string;
  usdg: `0x${string}`;
  reputation: `0x${string}`;
  vendorRegistry: `0x${string}`;
  settlementEscrow: `0x${string}`;
}

/** Local anvil deployment (from addresses.local.json) shares the same shape. */
export type LocalChain = Deployment;

/** USDG is a 6-decimal stablecoin across the whole system. */
export const USDG_DECIMALS = 6;

/** Robinhood Chain Testnet — committed public deployment. */
export const ROBINHOOD = robinhoodDeployment as Deployment;

export const robinhoodChain = defineChain({
  id: ROBINHOOD.chainId,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD.rpcUrl] } },
  blockExplorers: { default: { name: "Explorer", url: ROBINHOOD.explorer ?? "" } },
  testnet: true,
});

export function anvilChain(local: Deployment) {
  return defineChain({
    id: local.chainId,
    name: "Anvil · Hoodwire local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [local.rpcUrl] } },
  });
}

/** Human label for a connected chain id. */
export function chainName(chainId: number | undefined, local: Deployment | null): string {
  if (chainId === ROBINHOOD.chainId) return "Robinhood Chain Testnet";
  if (local && chainId === local.chainId) return "Anvil local";
  return chainId ? `Unsupported network (${chainId})` : "Not connected";
}

/** Which deployment applies to the connected chain, if any. */
export function deploymentFor(chainId: number | undefined, local: Deployment | null): Deployment | null {
  if (chainId === ROBINHOOD.chainId) return ROBINHOOD;
  if (local && chainId === local.chainId) return local;
  return null;
}

/**
 * wagmi config supporting Robinhood testnet (always) plus the local anvil chain
 * when a local deployment is present. Injected connector so "Connect wallet" works.
 */
export function makeConfig(local: Deployment | null) {
  const chains: readonly [Chain, ...Chain[]] = local
    ? [robinhoodChain, anvilChain(local)]
    : [robinhoodChain];

  const transports: Record<number, ReturnType<typeof http>> = {
    [robinhoodChain.id]: http(ROBINHOOD.rpcUrl),
  };
  if (local) transports[local.chainId] = http(local.rpcUrl);

  return createConfig({ chains, connectors: [injected()], transports, ssr: true });
}
