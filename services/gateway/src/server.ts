import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { calls, type SettledCall } from "./events.js";
import { rollingMetrics } from "./metrics.js";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

/**
 * HTTP sidecar that shares the gateway's in-process event bus:
 *   GET /events          Server-Sent Events, one message per settled call
 *   GET /metrics/rolling JSON rollup of the event ring buffer
 *   GET /health          liveness
 */
export function startHttpServer(port: number): void {
  const server = createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end();
      return;
    }
    const path = (req.url ?? "/").split("?")[0];
    if (path === "/events") return handleSse(req, res);
    if (path === "/metrics/rolling") return json(res, rollingMetrics());
    if (path === "/health") return json(res, { ok: true, service: "hoodwire-gateway" });
    res.writeHead(404, CORS);
    res.end("not found");
  });

  server.on("error", (err) => console.error("[http] " + err.message));
  server.listen(port, () =>
    console.error(`hoodwire http/sse ready on :${port} (/events, /metrics/rolling)`),
  );
}

function json(res: ServerResponse, body: unknown): void {
  res.writeHead(200, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(body));
}

function handleSse(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...CORS,
  });
  // replay recent history so a fresh subscriber isn't staring at a blank feed
  for (const e of calls.recent(20)) res.write(`data: ${JSON.stringify(e)}\n\n`);

  const onCall = (e: SettledCall) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  calls.on("call", onCall);
  const ping = setInterval(() => res.write(": ping\n\n"), 15_000);

  req.on("close", () => {
    clearInterval(ping);
    calls.off("call", onCall);
  });
}
