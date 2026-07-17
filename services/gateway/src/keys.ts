import { createHmac, timingSafeEqual } from "node:crypto";
import { recoverMessageAddress, type Hex } from "viem";
import { agentKeyMessage } from "@hoodwire/sdk";

/**
 * Agent keys bind a caller to the wallet whose escrow they spend.
 *
 * A key is `hw_<address>_<hmac>` — it carries its own address, and the HMAC (keyed by a
 * server secret) is what makes it unforgeable. That keeps issuance stateless: nothing to
 * store, and keys survive a redeploy. Only the holder of the wallet's private key can get
 * one, because issuance requires a signature over agentKeyMessage().
 */
const SECRET = process.env.KEY_SECRET ?? process.env.GATEWAY_API_KEY ?? "";

/** Signatures older than this are rejected, so a leaked one can't mint keys forever. */
const MAX_AGE_MS = 5 * 60_000;

export const keysEnabled = SECRET.length > 0;

function sign(address: string): string {
  return createHmac("sha256", SECRET).update(address.toLowerCase()).digest("hex").slice(0, 32);
}

export function keyFor(address: string): string {
  return `hw_${address.toLowerCase()}_${sign(address)}`;
}

/** The wallet a key spends for, or null when the key is absent or forged. */
export function addressForKey(key: string): `0x${string}` | null {
  if (!keysEnabled) return null;
  const m = /^hw_(0x[a-f0-9]{40})_([a-f0-9]{32})$/.exec(key.trim().toLowerCase());
  if (!m) return null;
  const [, address, mac] = m;
  const expected = Buffer.from(sign(address), "utf8");
  const given = Buffer.from(mac, "utf8");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return address as `0x${string}`;
}

export type IssueResult =
  | { ok: true; key: string; address: `0x${string}` }
  | { ok: false; detail: string };

/** Issue a key to whoever proves control of `address` by signing agentKeyMessage(). */
export async function issueKey(
  address: string,
  signature: string,
  issuedAt: number,
): Promise<IssueResult> {
  if (!keysEnabled) return { ok: false, detail: "key issuance is not configured" };
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return { ok: false, detail: "invalid address" };
  if (!/^0x[a-fA-F0-9]+$/.test(signature)) return { ok: false, detail: "invalid signature" };
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > MAX_AGE_MS) {
    return { ok: false, detail: "signature expired — try again" };
  }
  try {
    const recovered = await recoverMessageAddress({
      message: agentKeyMessage(address, issuedAt),
      signature: signature as Hex,
    });
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return { ok: false, detail: "signature does not match the address" };
    }
    return { ok: true, key: keyFor(address), address: address.toLowerCase() as `0x${string}` };
  } catch {
    return { ok: false, detail: "could not verify the signature" };
  }
}
