import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy to the gateway's /call endpoint.
 *
 * The caller's own agent key is forwarded as-is: the gateway derives the paying wallet
 * from it, so this route can't be used to spend anyone else's escrow. It deliberately
 * does not hold a key of its own — an unauthenticated caller gets a 401 from the gateway.
 */
export async function POST(req: NextRequest) {
  const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (!gateway) return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "no_agent_key", detail: "create an agent key first — it binds calls to your wallet" },
      { status: 401 },
    );
  }

  let body: { capability?: string };
  try {
    body = (await req.json()) as { capability?: string };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const allowed = ["get_stock_price", "execute_swap", "get_lending_rate", "portfolio_snapshot"];
  const cap = body.capability && allowed.includes(body.capability) ? body.capability : "get_stock_price";

  try {
    const res = await fetch(`${gateway}/call/${cap}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify({ symbol: "tNVDA", tokenOut: "tNVDA", amountUsdg: 100 }),
    });
    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "gateway_unreachable" }, { status: 502 });
  }
}
