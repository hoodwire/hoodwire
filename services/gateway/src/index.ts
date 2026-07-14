/**
 * Hoodwire MCP gateway — stdio transport (for local MCP clients like Claude Desktop/Code).
 * Also starts the HTTP API/SSE sidecar, which exposes the same tools over MCP-over-HTTP.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ADAPTERS } from "./adapters/index.js";
import { buildMcpServer } from "./mcp-server.js";
import { startHttpServer } from "./server.js";

const server = buildMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);

const caps = [...new Set(ADAPTERS.flatMap((a) => a.capabilities))].join(", ");
console.error(`hoodwire gateway ready (stdio) — capabilities: ${caps}`);

// HTTP API + SSE + MCP-over-HTTP for the dashboard, metrics, and remote agents.
startHttpServer(Number(process.env.GATEWAY_PORT ?? 8787));
