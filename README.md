# ⌁ Hoodwire

**The financial routing & payment layer for AI agents — built on Robinhood Chain.**

![CI](https://github.com/hoodwire/hoodwire/actions/workflows/ci.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-C6F53E.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%E2%89%A520-333.svg)

One MCP connection. Every financial capability (`get_stock_price`, `execute_swap`,
`get_lending_rate`, `supply_collateral`, `portfolio_snapshot`, `bridge_quote`).
Every call is auctioned across registered vendors (Uniswap, Pleiades, Chainlink, Morpho),
ranked by **price × latency × onchain reputation**, and settled per-request in **USDG**.

## Repo layout

```
hoodwire/
├─ apps/web/            # Next.js site — landing, docs, registry, metrics, dashboard
├─ services/gateway/    # MCP server + routing auction + billing (TypeScript)
├─ packages/sdk/        # shared types & scoring logic used by web + gateway
└─ contracts/           # Foundry — VendorRegistry, Reputation, SettlementEscrow
```

## Prerequisites

- **Node.js ≥ 20** and **npm ≥ 10** (repo uses npm workspaces)
- **Foundry** (`curl -L https://foundry.paradigm.xyz | bash && foundryup`) — for contracts
- **Git**

## Quickstart

```bash
npm install                 # installs all workspaces

# 1. website (http://localhost:3000)
npm run dev:web

# 2. MCP gateway (stdio transport — plug into Claude Desktop / Claude Code)
npm run dev:gateway

# 3. contracts
cd contracts
forge install foundry-rs/forge-std   # first time only
forge test -vv
```

### Use the gateway from an MCP client

Add to your MCP config (Claude Desktop / Claude Code):

```json
{
  "mcpServers": {
    "hoodwire": {
      "command": "npm",
      "args": ["run", "start", "--workspace", "services/gateway", "--silent"],
      "cwd": "/absolute/path/to/hoodwire"
    }
  }
}
```

Then call tools like `execute_swap`, `get_stock_price` — the gateway runs the vendor
auction and returns the winning route. Vendors are currently **simulated adapters**;
each has a `// TODO(onchain)` marker where real `viem` calls go.

### Run a local chain

One command boots a local [anvil](https://book.getfoundry.sh/anvil/) chain, deploys the
contracts against it, and writes the deployed addresses where the app and gateway read
them:

```bash
npm run chain:dev        # requires Foundry (anvil, forge) on PATH
```

It generates two git-ignored files and then keeps anvil running (Ctrl-C to stop):

- `apps/web/lib/addresses.local.json` — consumed by the dashboard (chain id 31337, RPC,
  and the USDG / Reputation / VendorRegistry / SettlementEscrow addresses).
- `.env` — the same addresses plus `OPERATOR_PRIVATE_KEY` and `RPC_URL` for the gateway.

The chain uses anvil's deterministic account `#0` as the operator and dev wallet, and the
deploy seeds it with 10,000 USDG. With the chain up, run `npm run dev:web` in another
terminal; the dashboard connects to it automatically.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the packages fit together.

## Deploy the web app

The site (`apps/web`) is a standard Next.js app and deploys to Vercel with no code
changes:

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Set **Root Directory** to `apps/web`. Vercel detects the npm workspaces at the repo
   root and installs `@hoodwire/sdk` automatically.
3. Framework preset auto-detects as **Next.js** — leave the build and install commands at
   their defaults. Deploy.

The gateway and contracts are backend/onchain services and are not part of the web
deployment.

## Status / roadmap

- [x] Landing site with live routing visualization
- [x] Docs, registry, metrics, dashboard pages (simulated data)
- [x] MCP gateway with auction router + budget controls (in-memory billing)
- [x] Solidity: VendorRegistry, Reputation, SettlementEscrow + tests
- [ ] Wire adapters to real protocols via `viem` (see TODOs in `services/gateway/src/adapters`)
- [ ] Charge through `SettlementEscrow` instead of in-memory ledger
- [ ] Streamable HTTP transport + API-key auth for hosted MCP
- [ ] Indexer + real metrics feed for `apps/web`

## Notes

Hoodwire targets Robinhood Chain, but nothing in this repository is chain-specific: the
contracts and gateway run on any EVM chain (anvil or a testnet) today. Network figures on
the site and in the gateway are illustrative and kept internally consistent.

## License

MIT — see [`LICENSE`](LICENSE).
