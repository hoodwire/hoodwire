import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy to the gateway's key issuance. The gateway verifies the signature, so nothing
 * secret passes through here — the wallet's own signature is the credential.
 */
export async function POST(req: NextRequest) {
  const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (!gateway) return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const res = await fetch(`${gateway}/keys`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "gateway_unreachable" }, { status: 502 });
  }
}
