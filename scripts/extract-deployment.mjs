#!/usr/bin/env node
/*
 * Read the Foundry broadcast for a deployed chain and write a committable
 * deployments/<network>.json (public addresses only — never keys).
 *
 *   node scripts/extract-deployment.mjs <chainId> <network> <rpcUrl> <explorer>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [, , chainIdArg, network, rpcUrl = "", explorer = ""] = process.argv;
if (!chainIdArg || !network) {
  console.error("usage: extract-deployment.mjs <chainId> <network> <rpcUrl> <explorer>");
  process.exit(1);
}

const chainId = Number(chainIdArg);
const broadcast = resolve(ROOT, "contracts/broadcast/Deploy.s.sol", String(chainId), "run-latest.json");
const { transactions = [] } = JSON.parse(readFileSync(broadcast, "utf8"));

const byName = {};
let deployer = "";
for (const tx of transactions) {
  if (tx.transactionType === "CREATE" && tx.contractName && tx.contractAddress) {
    byName[tx.contractName] = tx.contractAddress;
  }
  if (!deployer && tx.tx?.from) deployer = tx.tx.from;
}

for (const name of ["MockUSDG", "Reputation", "VendorRegistry", "SettlementEscrow"]) {
  if (!byName[name]) {
    console.error(`missing ${name} in broadcast output`);
    process.exit(1);
  }
}

const out = {
  network,
  chainId,
  rpcUrl,
  explorer,
  operator: deployer,
  usdg: byName.MockUSDG,
  reputation: byName.Reputation,
  vendorRegistry: byName.VendorRegistry,
  settlementEscrow: byName.SettlementEscrow,
};

const outPath = resolve(ROOT, "apps/web/lib/deployments", `${network}.json`);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

console.log(`wrote apps/web/lib/deployments/${network}.json`);
for (const [name, addr] of Object.entries(byName)) {
  console.log(`  ${name} = ${explorer}/address/${addr}`);
}
