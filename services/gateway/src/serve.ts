/**
 * Hosted HTTP entrypoint (Railway / Render / any Node host).
 * Serves the gateway's HTTP API + SSE feed. Onchain settlement activates when
 * SETTLEMENT_ESCROW_ADDRESS + OPERATOR_PRIVATE_KEY + RPC_URL are set (see billing.ts).
 */
import { startHttpServer } from "./server.js";
import { ADAPTERS } from "./adapters/index.js";

const port = Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? 8787);
startHttpServer(port);

const caps = [...new Set(ADAPTERS.flatMap((a) => a.capabilities))].join(", ");
console.error(`hoodwire gateway (HTTP mode) ready — capabilities: ${caps}`);
