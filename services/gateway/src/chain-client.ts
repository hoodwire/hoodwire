import { createPublicClient, http, defineChain } from "viem";
import { CONFIG } from "./config.js";

/** Read-only viem client for the target chain (RPC_URL / CHAIN_ID from env). */
const chain = defineChain({
  id: Number(process.env.CHAIN_ID ?? 31337),
  name: "hoodwire-target",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
});

export const publicClient = createPublicClient({ chain, transport: http(CONFIG.rpcUrl) });
