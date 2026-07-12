import type { Capability, Quote } from "@hoodwire/sdk";

export interface ExecutionResult {
  ok: boolean;
  /** human/agent-readable result payload */
  data: Record<string, unknown>;
  actualLatencyMs: number;
}

/** Every vendor integration implements this. Register it in adapters/index.ts. */
export interface VendorAdapter {
  id: string;
  name: string;
  capabilities: Capability[];
  /** Fast estimate used in the auction (<100ms budget). */
  quote(capability: Capability, params: Record<string, unknown>): Promise<Quote>;
  /** Actually perform the call after winning the auction. */
  execute(capability: Capability, params: Record<string, unknown>): Promise<ExecutionResult>;
  healthcheck(): Promise<boolean>;
}

/** deterministic-ish jitter so simulated latencies look alive but stay plausible */
export function jitter(base: number, spread = 0.18): number {
  return Math.round(base * (1 + (Math.random() * 2 - 1) * spread));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
