/**
 * Hoodwire MCP gateway — stdio transport.
 * One connection, every financial capability. Each call: precheck budget →
 * auction across vendors → execute winner → charge → update reputation.
 *
 * Run: npm run dev:gateway   (or wire into Claude Desktop/Code, see README)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Capability } from "@hoodwire/sdk";
import { route } from "./router.js";
import { ADAPTERS } from "./adapters/index.js";
import { precheck, charge, getAccount, setBudget } from "./billing.js";
import { recordCall, snapshot } from "./reputation.js";

// single-user dev mode; hosted mode derives this from the bearer token
const USER = "dev-user";

const server = new McpServer({ name: "hoodwire", version: "0.1.0" });

async function handle(capability: Capability, params: Record<string, unknown>) {
  const routed = await route(capability, params);
  const pre = precheck(USER, routed.winner.priceUsdg);
  if (!pre.ok) {
    return {
      content: [{ type: "text" as const, text: `blocked (${pre.reason}): ${pre.detail}` }],
      isError: true,
    };
  }

  const adapter = ADAPTERS.find((a) => a.id === routed.adapterId)!;
  const result = await adapter.execute(capability, params);
  charge(USER, routed.winner.priceUsdg);
  recordCall(adapter.id, result.ok, result.actualLatencyMs);

  const acct = getAccount(USER);
  const summary = {
    capability,
    routedTo: adapter.id,
    feeUsdg: routed.winner.priceUsdg,
    routingMs: routed.routedInMs,
    executionMs: result.actualLatencyMs,
    losingBids: routed.losers.map((l) => `${l.vendorId} @ ${l.priceUsdg} USDG`),
    balanceUsdg: acct.balanceUsdg,
    ...(pre.warnLowBalance ? { warning: `low balance — below ${acct.budget.lowBalanceAlertUsdg} USDG alert` } : {}),
    result: result.data,
  };
  return { content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }] };
}

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
  async () => {
    const a = getAccount(USER);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ account: a, vendors: snapshot() }, null, 2),
      }],
    };
  },
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

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("hoodwire gateway ready (stdio) — capabilities: " +
  ADAPTERS.flatMap((a) => a.capabilities).filter((v, i, s) => s.indexOf(v) === i).join(", "));
