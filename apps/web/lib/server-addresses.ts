// Server-only: imported exclusively by the /dashboard server component, so the
// node:fs dependency never reaches the client bundle.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LocalChain } from "./chain";

/**
 * Load the local deployment written by `npm run chain:dev`. The file is
 * git-ignored and absent in CI / production, so a missing or malformed file
 * simply yields null and the dashboard falls back to demo mode.
 */
export function loadLocalChain(): LocalChain | null {
  try {
    const path = join(process.cwd(), "lib", "addresses.local.json");
    const data = JSON.parse(readFileSync(path, "utf8")) as Partial<LocalChain>;
    if (!data.settlementEscrow || !data.usdg || !data.chainId) return null;
    return data as LocalChain;
  } catch {
    return null;
  }
}
