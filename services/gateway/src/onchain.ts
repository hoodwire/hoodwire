import {
  createPublicClient, createWalletClient, http, defineChain, parseUnits, stringToHex,
  BaseError, ContractFunctionRevertedError, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CONFIG } from "./config.js";
import { escrowAbi } from "./abis.js";

/** Onchain settlement is active only when both the escrow address and operator key are set. */
export const onchainEnabled = Boolean(CONFIG.escrowAddress && CONFIG.operatorKey);

export type OnchainCharge =
  | { ok: true; hash: Hex }
  | { ok: false; reason: "insufficient_balance" | "daily_limit" | "onchain_error"; detail: string };

const chain = defineChain({
  id: Number(process.env.CHAIN_ID ?? 31337),
  name: "hoodwire-target",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
});

let cached: ReturnType<typeof build> | null = null;
function build() {
  const raw = CONFIG.operatorKey;
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  const account = privateKeyToAccount(key);
  return {
    account,
    escrow: CONFIG.escrowAddress as Hex,
    publicClient: createPublicClient({ chain, transport: http(CONFIG.rpcUrl) }),
    walletClient: createWalletClient({ account, chain, transport: http(CONFIG.rpcUrl) }),
  };
}
function clients() {
  return (cached ??= build());
}

/**
 * Settle a call through SettlementEscrow.charge(): debit `user`'s escrow, pay the vendor,
 * and report to Reputation. Falls back to the operator's own escrow when no user address
 * is given. Vendor payout is still the operator until vendors register payout addresses.
 */
export async function chargeOnchain(
  feeUsdg: number,
  vendor: string,
  success: boolean,
  latencyMs: number,
  user?: Hex,
): Promise<OnchainCharge> {
  const { account, escrow, publicClient, walletClient } = clients();
  const payer = user ?? account.address;
  const fee = parseUnits(feeUsdg.toFixed(6) as `${number}`, 6);
  const vendorId = stringToHex(vendor, { size: 32 });
  try {
    // Legacy (gasPrice) tx — matches how forge deploys on this L2 and avoids
    // EIP-1559 fee methods the RPC rejects with -32602.
    const gasPrice = await publicClient.getGasPrice();
    const hash = await walletClient.writeContract({
      address: escrow,
      abi: escrowAbi,
      functionName: "charge",
      args: [payer, vendorId, account.address, fee, success, Math.min(Math.round(latencyMs), 4_294_967_295)],
      type: "legacy",
      gasPrice,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return { ok: true, hash };
  } catch (e) {
    console.error("[charge] onchain error:", e);
    const revert = e instanceof BaseError ? e.walk((err) => err instanceof ContractFunctionRevertedError) : null;
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name === "DailyLimitExceeded") {
        return { ok: false, reason: "daily_limit", detail: "onchain daily limit reached. Resets at UTC midnight." };
      }
      if (name === "InsufficientBalance") {
        return { ok: false, reason: "insufficient_balance", detail: "escrow balance too low — top up the deposit wallet" };
      }
    }
    return { ok: false, reason: "onchain_error", detail: e instanceof Error ? e.message.split("\n")[0] : String(e) };
  }
}
