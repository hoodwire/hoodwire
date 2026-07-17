import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Capability } from "@hoodwire/sdk";
import { calls, type SettledCall } from "./events.js";
import { rollingMetrics } from "./metrics.js";
import { runCapability } from "./pipeline.js";
import { buildMcpServer } from "./mcp-server.js";
import { ADAPTERS } from "./adapters/index.js";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// When GATEWAY_API_KEY is set, POST /call requires `Authorization: Bearer <key>`.
const API_KEY = process.env.GATEWAY_API_KEY ?? "";

const CAPABILITIES: string[] = [...new Set(ADAPTERS.flatMap((a) => a.capabilities))];

// Auth via `Authorization: Bearer <key>` OR a `?key=<key>` query param
// (the latter lets MCP clients that only take a URL, like Claude's connector UI, authenticate).
function authorized(req: IncomingMessage): boolean {
  if (!API_KEY) return true;
  if (req.headers["authorization"] === `Bearer ${API_KEY}`) return true;
  try {
    return new URL(req.url ?? "/", "http://gateway").searchParams.get("key") === API_KEY;
  } catch {
    return false;
  }
}

/**
 * HTTP surface for the gateway, shared with the MCP server via the same in-process
 * router/billing/pipeline:
 *   GET  /health            liveness + capability list
 *   GET  /capabilities      capability list
 *   GET  /events            SSE, one message per settled call
 *   GET  /metrics/rolling   rollup of recent calls
 *   POST /call/:capability  run a capability (auth required when GATEWAY_API_KEY set)
 */
export function startHttpServer(port: number): void {
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  server.on("error", (err) => console.error("[http] " + err.message));
  // Loopback for local dev; all interfaces when a PORT is injected by the host.
  const host = process.env.PORT ? "0.0.0.0" : "127.0.0.1";
  server.listen(port, host, () =>
    console.error(`hoodwire gateway http on ${host}:${port} (/call, /events, /metrics/rolling)`),
  );
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  const path = (req.url ?? "/").split("?")[0];

  if (path === "/health") return json(res, { ok: true, service: "hoodwire-gateway", capabilities: CAPABILITIES });
  if (path === "/capabilities") return json(res, { capabilities: CAPABILITIES });
  if (path === "/metrics/rolling") return json(res, rollingMetrics());
  if (path === "/events") return handleSse(req, res);

  // MCP-over-HTTP (Streamable HTTP) — connect Claude Desktop/Code or any MCP client here.
  if (path === "/mcp") {
    if (!authorized(req)) return json(res, { error: "unauthorized" }, 401);
    return handleMcp(req, res);
  }

  if (req.method === "POST" && path.startsWith("/call/")) {
    if (!authorized(req)) return json(res, { error: "unauthorized" }, 401);
    const capStr = path.slice("/call/".length);
    if (!CAPABILITIES.includes(capStr)) {
      return json(res, { error: `unknown capability: ${capStr}`, capabilities: CAPABILITIES }, 404);
    }
    const params = await readBody(req);
    // `user` (a wallet address) makes the call settle against that address's escrow.
    const user = typeof params.user === "string" && /^0x[a-fA-F0-9]{40}$/.test(params.user)
      ? params.user
      : "http-user";
    const result = await runCapability(capStr as Capability, params, user);
    if (!result.ok) return json(res, { error: result.reason, detail: result.detail }, 402);
    return json(res, result.summary);
  }

  res.writeHead(404, CORS);
  res.end("not found");
}

function json(res: ServerResponse, body: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(body));
}

// Stateless MCP-over-HTTP: a fresh server + transport per request.
async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = req.method === "POST" ? await readBody(req) : undefined;
  const server = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function handleSse(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...CORS,
  });
  for (const e of calls.recent(20)) res.write(`data: ${JSON.stringify(e)}\n\n`);

  const onCall = (e: SettledCall) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  calls.on("call", onCall);
  const ping = setInterval(() => res.write(": ping\n\n"), 15_000);

  req.on("close", () => {
    clearInterval(ping);
    calls.off("call", onCall);
  });
}
