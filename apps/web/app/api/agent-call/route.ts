import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side proxy to the gateway's /call endpoint.
 * Keeps GATEWAY_API_KEY on the server so the browser never sees it. The gateway
 * settles the call against the caller's own escrow (see billing.payerOf).
 */
export async function POST(req: NextRequest) {
  const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (!gateway) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  }

  let body: { user?: string; capability?: string };
  try {
    body = (await req.json()) as { user?: string; capability?: string };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { user, capability } = body;
  if (!user || !/^0x[a-fA-F0-9]{40}$/.test(user)) {
    return NextResponse.json({ error: "invalid_user_address" }, { status: 400 });
  }

  const allowed = ["get_stock_price", "execute_swap", "get_lending_rate", "portfolio_snapshot"];
  const cap = capability && allowed.includes(capability) ? capability : "get_stock_price";

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.GATEWAY_API_KEY) headers.authorization = `Bearer ${process.env.GATEWAY_API_KEY}`;

  try {
    const res = await fetch(`${gateway}/call/${cap}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user, symbol: "tNVDA", tokenOut: "tNVDA", amountUsdg: 100 }),
    });
    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "gateway_unreachable" }, { status: 502 });
  }
}
