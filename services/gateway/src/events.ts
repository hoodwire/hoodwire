import { EventEmitter } from "node:events";

/** One settled capability call, broadcast to every SSE subscriber. */
export interface SettledCall {
  id: number;
  ts: number; // epoch ms
  capability: string;
  vendor: string;
  feeUsdg: number;
  routingMs: number;
  executionMs: number;
  ok: boolean;
  losingBids: string[];
}

/**
 * In-process bus shared by the MCP stdio server and the HTTP/SSE server.
 * Keeps a bounded ring buffer so new subscribers and the rolling-metrics
 * endpoint can see recent history.
 */
class CallBus extends EventEmitter {
  private seq = 0;
  private ring: SettledCall[] = [];
  private readonly cap = 1000;

  publish(e: Omit<SettledCall, "id" | "ts">): SettledCall {
    const call: SettledCall = { ...e, id: ++this.seq, ts: Date.now() };
    this.ring.push(call);
    if (this.ring.length > this.cap) this.ring.shift();
    this.emit("call", call);
    return call;
  }

  recent(limit = 50): SettledCall[] {
    return this.ring.slice(-limit);
  }

  all(): readonly SettledCall[] {
    return this.ring;
  }
}

export const calls = new CallBus();
