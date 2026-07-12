# Architecture

Hoodwire is a routing and payment layer for AI agents: a single MCP endpoint that
auctions each capability call across registered vendors and settles it per request in
USDG on Robinhood Chain.

```
apps/web ──imports──┐
                    ├──> packages/sdk   (types + scoring, single source of truth)
services/gateway ───┘
services/gateway ──charges──> contracts/SettlementEscrow ──reports──> contracts/Reputation
```

## Packages

### `packages/sdk`
The shared contract between the site and the gateway. Owns the capability and quote
types (`Capability`, `Quote`, `RouteResult`, `VendorInfo`) and the scoring function
`pickWinner()`, which ranks quotes by **price × latency × onchain reputation**. Both
`apps/web` and `services/gateway` depend on `@hoodwire/sdk`, so the auction logic shown
on the marketing site is the exact logic the gateway runs.

### `services/gateway`
The MCP server (`@modelcontextprotocol/sdk`, stdio transport). Every tool call follows
the same pipeline:

1. `router.route()` quotes every adapter that supports the capability, in parallel.
2. `pickWinner()` scores the quotes and selects a winner.
3. `billing.precheck()` enforces the caller's budget controls.
4. The winning adapter executes the call.
5. `billing.charge()` deducts the fee and `reputation.recordCall()` updates the score.

Adapters (`src/adapters/`) are currently simulated. Each carries a `TODO(onchain)`
marker at the exact point where a real `viem` call to Uniswap, Pleiades, Chainlink, or
Morpho belongs.

### `contracts`
Foundry project with three contracts:

- **`VendorRegistry`** — permissionless vendor registration backed by a USDG stake, with
  slashing for misbehavior.
- **`Reputation`** — append-only per-vendor score derived from settled calls.
- **`SettlementEscrow`** — holds user USDG deposits, enforces an onchain daily limit,
  pays the vendor and a protocol fee per call (operator-gated), and reports to
  `Reputation`. Users can withdraw their balance at any time.

The contracts are chain-agnostic and run on any EVM chain (anvil or a testnet) today.

### `apps/web`
Next.js App Router site. `components/landing.jsx` is the marketing page (WebGL shader
background, live routing visualization, interactive budget controls). Additional routes
—`/docs`, `/registry`, `/metrics`, `/dashboard`— render from the simulated data in
`lib/vendors.ts`.

## Conventions

- TypeScript `strict` across every package; Solidity `0.8.24` with custom errors.
- Never commit `.env`. The operator key is testnet-only.
- Design tokens: background `#0B0E0C`, lime `#C6F53E`, ink `#EDEFEA`, muted `#8A9484`.
- Simulated figures are internally consistent (p50 782 ms, 23% average saving) and must
  stay that way across the site and the gateway.

## Roadmap

1. Replace the simulated adapters with `viem` calls (Uniswap v3 quoter, Chainlink feeds,
   Morpho markets).
2. Route billing through `SettlementEscrow.charge()` instead of the in-memory ledger.
3. Add a Streamable HTTP transport and bearer-token auth for a hosted gateway.
4. Feed `/metrics` from real gateway events instead of static data.
