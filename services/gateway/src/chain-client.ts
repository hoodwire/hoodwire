import { createPublicClient, http, defineChain } from "viem";
import { CONFIG } from "./config.js";

/** Read-only viem client for the settlement chain (RPC_URL / CHAIN_ID from env). */
const chain = defineChain({
  id: Number(process.env.CHAIN_ID ?? 31337),
  name: "hoodwire-target",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
});

export const publicClient = createPublicClient({ chain, transport: http(CONFIG.rpcUrl) });

/**
 * Read-only client for price feeds, which may live on a different chain than settlement.
 *
 * Chainlink publishes Robinhood Chain feeds on mainnet only, so a testnet deployment can
 * still serve real prices by reading them from mainnet: price reads cost no gas and touch
 * no funds. Set CHAINLINK_RPC_URL (+ CHAINLINK_CHAIN_ID) to enable that; without it,
 * prices are read from the settlement chain like everything else.
 */
const priceRpc = process.env.CHAINLINK_RPC_URL;

const priceChain = priceRpc
  ? defineChain({
      id: Number(process.env.CHAINLINK_CHAIN_ID ?? 0),
      name: "hoodwire-prices",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [priceRpc] } },
    })
  : chain;

export const priceClient = priceRpc
  ? createPublicClient({ chain: priceChain, transport: http(priceRpc) })
  : publicClient;

/** True when prices come from a chain other than the one calls settle on. */
export const pricesAreRemote = Boolean(priceRpc);
