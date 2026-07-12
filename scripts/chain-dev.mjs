#!/usr/bin/env node
/*
 * chain:dev — boot a local anvil chain, deploy the Hoodwire contracts against it,
 * and write the deployed addresses where the web app and gateway can read them.
 *
 *   node scripts/chain-dev.mjs
 *
 * Produces (both git-ignored):
 *   - apps/web/lib/addresses.local.json   (consumed by the dashboard)
 *   - .env                                 (SETTLEMENT_ESCROW_ADDRESS, ... for the gateway)
 *
 * anvil keeps running in the foreground; Ctrl-C stops it.
 * Requires Foundry (anvil, forge) on PATH.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACTS = resolve(ROOT, "contracts");

const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 31337;
// anvil's deterministic account #0 — local dev only, never a real key.
const DEV_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const DEV_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const isWin = process.platform === "win32";

function log(msg) {
  process.stdout.write(`\x1b[38;2;198;245;62m[chain:dev]\x1b[0m ${msg}\n`);
}

async function waitForRpc(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("anvil did not become ready in time");
}

function run(cmd, args, opts) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited with ${code}`)),
    );
  });
}

function readDeployedAddresses() {
  const broadcast = resolve(CONTRACTS, "broadcast/Deploy.s.sol", String(CHAIN_ID), "run-latest.json");
  if (!existsSync(broadcast)) throw new Error(`broadcast file not found: ${broadcast}`);
  const { transactions } = JSON.parse(readFileSync(broadcast, "utf8"));
  const byName = {};
  for (const tx of transactions ?? []) {
    if (tx.transactionType === "CREATE" && tx.contractName && tx.contractAddress) {
      byName[tx.contractName] = tx.contractAddress;
    }
  }
  const required = ["MockUSDG", "Reputation", "VendorRegistry", "SettlementEscrow"];
  for (const name of required) {
    if (!byName[name]) throw new Error(`missing ${name} in broadcast output`);
  }
  return byName;
}

function writeAddressesJson(a) {
  const out = {
    chainId: CHAIN_ID,
    rpcUrl: RPC_URL,
    operator: DEV_ADDRESS,
    usdg: a.MockUSDG,
    reputation: a.Reputation,
    vendorRegistry: a.VendorRegistry,
    settlementEscrow: a.SettlementEscrow,
  };
  const path = resolve(ROOT, "apps/web/lib/addresses.local.json");
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
  log(`wrote apps/web/lib/addresses.local.json`);
}

function writeEnv(a) {
  const path = resolve(ROOT, ".env");
  const seed = existsSync(path)
    ? readFileSync(path, "utf8")
    : existsSync(resolve(ROOT, ".env.example"))
      ? readFileSync(resolve(ROOT, ".env.example"), "utf8")
      : "";
  const values = {
    GATEWAY_PORT: "8787",
    OPERATOR_PRIVATE_KEY: DEV_PRIVATE_KEY,
    RPC_URL,
    SETTLEMENT_ESCROW_ADDRESS: a.SettlementEscrow,
    VENDOR_REGISTRY_ADDRESS: a.VendorRegistry,
    REPUTATION_ADDRESS: a.Reputation,
    USDG_ADDRESS: a.MockUSDG,
  };
  const lines = seed.split(/\r?\n/);
  const seen = new Set();
  const next = lines.map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    if (m && m[1] in values) {
      seen.add(m[1]);
      return `${m[1]}=${values[m[1]]}`;
    }
    return line;
  });
  for (const [k, v] of Object.entries(values)) {
    if (!seen.has(k)) next.push(`${k}=${v}`);
  }
  writeFileSync(path, next.join("\n").replace(/\n+$/, "\n"));
  log(`updated .env with deployed addresses`);
}

async function main() {
  log("starting anvil on " + RPC_URL + " (chain " + CHAIN_ID + ")");
  const anvil = spawn("anvil", ["--chain-id", String(CHAIN_ID), "--silent"], {
    stdio: "inherit",
    shell: isWin,
  });
  anvil.on("error", (err) => {
    console.error("failed to start anvil — is Foundry installed and on PATH?", err);
    process.exit(1);
  });

  const shutdown = () => {
    anvil.kill("SIGINT");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForRpc();
    log("anvil ready — deploying contracts");
    await run("forge", [
      "script", "script/Deploy.s.sol",
      "--rpc-url", RPC_URL,
      "--broadcast",
      "--private-key", DEV_PRIVATE_KEY,
    ], { cwd: CONTRACTS });

    const addresses = readDeployedAddresses();
    writeAddressesJson(addresses);
    writeEnv(addresses);

    log("done. contracts deployed:");
    for (const [name, addr] of Object.entries(addresses)) log(`  ${name} = ${addr}`);
    log("dev wallet " + DEV_ADDRESS + " funded with 10,000 USDG. anvil is running — Ctrl-C to stop.");
  } catch (err) {
    console.error("[chain:dev] deploy failed:", err.message);
    anvil.kill("SIGINT");
    process.exit(1);
  }
}

main();
