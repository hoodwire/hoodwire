<p align="center">
  <img src="apps/web/app/opengraph-image.png" alt="Hoodwire — the financial routing layer for AI agents" width="640">
</p>

<h3 align="center">The financial routing & payment layer for AI agents</h3>

<p align="center">
  An AI agent connects once over MCP, calls a <i>capability</i> instead of a vendor,<br>
  and every call is auctioned across providers and settled onchain — per request.
</p>

<p align="center">
  <a href="https://www.hoodwire.xyz"><b>Website</b></a> ·
  <a href="https://explorer.testnet.chain.robinhood.com"><b>Explorer</b></a> ·
  <a href="https://x.com/hoodwirexyz"><b>X</b></a> ·
  <a href="docs/ARCHITECTURE.md"><b>Architecture</b></a>
</p>

<p align="center">
  <img src="https://github.com/hoodwire/hoodwire/actions/workflows/ci.yml/badge.svg" alt="CI">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-C6F53E.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A520-333.svg" alt="Node >= 20">
  <img src="https://img.shields.io/badge/chain-Robinhood%20testnet-C6F53E.svg" alt="Robinhood Chain testnet">
</p>

---

## Why

An AI agent that wants a stock price, a swap, or a lending rate needs an account, an API
key, and a payment method for every single vendor. Agents can't hold a credit card — so
they can't act.

Hoodwire gives an agent one connection and a prepaid onchain balance. It calls a
capability; Hoodwire picks the provider and charges the fee per request.

## How it works

| | Step | What happens |
|---|---|---|
| **01** | **Call** | One MCP connection, any agent framework. The agent never picks a vendor. |
| **02** | **Route** | A real-time auction across registered vendors, ranked by **price × latency × onchain reputation**. |
| **03** | **Settle** | The fee is charged from an onchain escrow, the result returns, vendor reputation updates. |

Capabilities: `get_stock_price` · `execute_swap` · `get_lending_rate` ·
`supply_collateral` · `portfolio_snapshot` · `bridge_quote`

## Live on Robinhood Chain testnet

Chain ID **46630** · RPC `https://rpc.testnet.chain.robinhood.com`

| Contract | Address |
|---|---|
| SettlementEscrow | [`0x9c246d3a…711f`](https://explorer.testnet.chain.robinhood.com/address/0x9c246d3a8a2fff0bbedfefe81cd35da96091711f) |
| MockUSDG | [`0xff266950…ce42`](https://explorer.testnet.chain.robinhood.com/address/0xff2669504001138966a3da1223b99dd786f0ce42) |
| Reputation | [`0x9e7e5cd0…8956`](https://explorer.testnet.chain.robinhood.com/address/0x9e7e5cd0be4a713b75c5e41ea5009e826be58956) |
| VendorRegistry | [`0x0f6f989d…d937`](https://explorer.testnet.chain.robinhood.com/address/0x0f6f989d76c50094c21a8df85dd60e80ca87d937) |

Addresses are committed at [`apps/web/lib/deployments/robinhood-testnet.json`](apps/web/lib/deployments/robinhood-testnet.json).
Deposits, withdrawals, daily limits and per-call charges are real onchain transactions.

## Repo layout

```
hoodwire/
├─ apps/web/            Next.js site — landing, docs, registry, metrics, dashboard
├─ services/gateway/    MCP server + HTTP API + routing auction + billing
├─ packages/sdk/        shared types & scoring, used by web and gateway
└─ contracts/           Foundry — VendorRegistry, Reputation, SettlementEscrow
```

## Quickstart

Requires **Node.js ≥ 20** and [**Foundry**](https://book.getfoundry.sh/getting-started/installation) (for contracts).

```bash
npm install

npm run chain:dev     # anvil + deploy + write addresses (needs Foundry)
npm run dev:web       # http://localhost:3000
npm run dev:gateway   # MCP over stdio + HTTP API on :8787
```

`chain:dev` boots a local anvil chain, deploys the contracts, and writes two git-ignored
files: `apps/web/lib/addresses.local.json` (read by the dashboard) and `.env` (read by the
gateway). It seeds anvil account `#0` with 10,000 USDG and keeps the chain running.

Contract tests:

```bash
cd contracts
forge install foundry-rs/forge-std   # first time only
forge test -vv
```

## Connect an agent

**Hosted (MCP over HTTP)** — point any MCP client at the gateway:

```
https://mcp.hoodwire.xyz/mcp
```

Authenticate with `Authorization: Bearer <GATEWAY_API_KEY>`, or `?key=<GATEWAY_API_KEY>`
for clients that only accept a URL.

**Local (MCP over stdio)** — add to your MCP client config:

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

### HTTP API

The gateway serves this alongside MCP, sharing the same router and billing:

| Endpoint | Purpose |
|---|---|
| `POST /call/:capability` | Run a capability (JSON body = params). Auth required when `GATEWAY_API_KEY` is set. |
| `GET /mcp` `POST /mcp` | MCP over Streamable HTTP. |
| `GET /events` | Server-Sent Events — one message per settled call. |
| `GET /metrics/rolling` | Rolling aggregate of recent calls. |
| `GET /health` `GET /capabilities` | Liveness and capability list. |

## Deploy

**Web (Vercel).** Import the repo, set **Root Directory** to `apps/web`, keep the defaults.
Set `NEXT_PUBLIC_GATEWAY_URL` to your gateway URL to make `/metrics` and the activity feed
read live data (leave it unset and the site falls back to onchain/demo data).

**Gateway (Railway).** The repo includes `railway.json`; the start command is
`npm run serve:gateway`. The gateway runs TypeScript directly via `tsx`, so it has no
build step — `railway.json` overrides the build command to keep the web's `next build`
out of the gateway's deploy. Set:

- `RPC_URL`, `CHAIN_ID`, and the four contract addresses
- `OPERATOR_PRIVATE_KEY` — testnet operator key (**secret**)
- `GATEWAY_API_KEY` — any strong random string, protects `POST /call` and `/mcp`

With `SETTLEMENT_ESCROW_ADDRESS` + `OPERATOR_PRIVATE_KEY` set, each call settles through
`SettlementEscrow.charge()` onchain; without them it uses the in-memory ledger.

**Contracts.** Deploy via the manual GitHub Actions workflow
([`deploy-testnet.yml`](.github/workflows/deploy-testnet.yml)) — it runs `forge test`,
checks the deployer balance, deploys, and commits the addresses.

## Status

- [x] Contracts deployed and verified working on Robinhood Chain testnet
- [x] Dashboard: connect wallet, mint test USDG, deposit / withdraw, onchain daily limit
- [x] Activity feed reads real `Charged` events from the escrow
- [x] Hosted gateway — HTTP API + MCP over Streamable HTTP, with bearer auth
- [x] Per-call settlement through `SettlementEscrow.charge()`
- [ ] Replace simulated vendor adapters with real protocol calls (`TODO(onchain)` markers in `services/gateway/src/adapters`)
- [ ] Register real vendors onchain in `VendorRegistry`
- [ ] Security audit, real USDG, and key management — required before mainnet

## Notes

Vendor adapters are currently **simulated**: routing, billing and settlement are real, but
the market data each vendor returns is illustrative.

The Chainlink adapter is the exception — set `CHAINLINK_FEEDS` to a `{"tAAPL":"0x…"}` map of
official aggregator proxies ([Chainlink maintains the
list](https://docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood)) and it
reads prices onchain, validating the answer, round freshness (`CHAINLINK_MAX_STALENESS_SEC`,
default 3600) and — with `CHAINLINK_SEQUENCER_FEED` set — L2 sequencer uptime. A configured
feed never falls back to a simulated mark: callers get a real price or an error. Failed
vendor calls count against reputation and are not charged.

Chainlink publishes Robinhood Chain feeds on **mainnet only**, so a testnet deployment reads
them from mainnet via `CHAINLINK_RPC_URL` (+ `CHAINLINK_CHAIN_ID`) while settlement stays on
testnet — price reads cost no gas and touch no funds. Responses say `chainlink-onchain
(price chain)` when the price came from a chain other than the one the call settled on.

Nothing here is chain-specific — the contracts and gateway run on any EVM chain.

## License

MIT — see [`LICENSE`](LICENSE).
