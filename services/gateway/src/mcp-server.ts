import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Capability } from "@hoodwire/sdk";
import { getAccount, setBudget } from "./billing.js";
import { snapshot } from "./reputation.js";
import { runCapability } from "./pipeline.js";

// Single-user dev mode; a hosted multi-tenant gateway would derive this from the bearer token.
const USER = "dev-user";

async function handle(capability: Capability, params: Record<string, unknown>) {
  const res = await runCapability(capability, params, USER);
  if (!res.ok) {
    return { content: [{ type: "text" as const, text: `blocked (${res.reason}): ${res.detail}` }], isError: true };
  }
  return { content: [{ type: "text" as const, text: JSON.stringify(res.summary, null, 2) }] };
}

/** Build a fresh MCP server with every Hoodwire tool — used by both the stdio and HTTP transports. */
export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "hoodwire", version: "0.1.0" });

  server.tool(
    "get_stock_price",
    "Real-time Stock Token price in USDG (routed, typically Chainlink feeds).",
    { symbol: z.string().describe("Stock Token symbol, e.g. tNVDA, tAAPL, tGOOGL") },
    async ({ symbol }) => handle("get_stock_price", { symbol }),
  );

  server.tool(
    "execute_swap",
    "Swap on the best AMM (Uniswap v3 vs Pleiades), auctioned by price × latency × reputation.",
    {
      tokenIn: z.string().default("USDG"),
      tokenOut: z.string().describe("e.g. tNVDA"),
      amountUsdg: z.number().positive().describe("notional in USDG"),
    },
    async (p) => handle("execute_swap", p),
  );

  server.tool(
    "get_lending_rate",
    "Current supply/borrow APY for a lending market (routed, typically Morpho).",
    { asset: z.string().default("USDG"), collateral: z.string().default("tNVDA") },
    async (p) => handle("get_lending_rate", p),
  );

  server.tool(
    "supply_collateral",
    "Supply USDG to the best lending market.",
    { amountUsdg: z.number().positive(), collateral: z.string().default("tNVDA") },
    async (p) => handle("supply_collateral", p),
  );

  server.tool(
    "portfolio_snapshot",
    "Snapshot of the connected wallet's positions.",
    { wallet: z.string().optional() },
    async (p) => handle("portfolio_snapshot", p),
  );

  server.tool(
    "bridge_quote",
    "Quote bridging USDG between Robinhood Chain and Ethereum L1.",
    { direction: z.enum(["to_l1", "to_l2"]).default("to_l1"), amountUsdg: z.number().positive() },
    async (p) => handle("bridge_quote", p),
  );

  server.tool(
    "hoodwire_account",
    "Inspect balance, today's spend, budget controls, and vendor reputations.",
    {},
    async () => ({
      content: [{ type: "text" as const, text: JSON.stringify({ account: getAccount(USER), vendors: snapshot() }, null, 2) }],
    }),
  );

  server.tool(
    "hoodwire_set_budget",
    "Update budget controls (daily limit / approval threshold / low-balance alert). 0 disables a control.",
    {
      dailyLimitUsdg: z.number().min(0).optional(),
      approvalThresholdUsdg: z.number().min(0).optional(),
      lowBalanceAlertUsdg: z.number().min(0).optional(),
    },
    async (patch) => ({
      content: [{ type: "text" as const, text: JSON.stringify(setBudget(USER, patch), null, 2) }],
    }),
  );

  return server;
}
