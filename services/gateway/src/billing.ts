import { DEFAULT_BUDGET, type BudgetConfig } from "@hoodwire/sdk";

/**
 * In-memory USDG ledger mirroring SettlementEscrow semantics.
 * TODO(onchain): replace with escrow.charge() via viem using the operator wallet;
 * keep this as an optimistic cache in front of the chain.
 */
interface Account {
  balanceUsdg: number;
  spentTodayUsdg: number;
  day: number; // UTC day index
  budget: BudgetConfig;
}

const accounts = new Map<string, Account>();
const utcDay = () => Math.floor(Date.now() / 86_400_000);

export function getAccount(user: string): Account {
  let a = accounts.get(user);
  if (!a) {
    a = { balanceUsdg: 50, spentTodayUsdg: 0, day: utcDay(), budget: { ...DEFAULT_BUDGET } };
    accounts.set(user, a);
  }
  if (a.day !== utcDay()) { a.day = utcDay(); a.spentTodayUsdg = 0; }
  return a;
}

export type Precheck =
  | { ok: true; warnLowBalance: boolean }
  | { ok: false; reason: "insufficient_balance" | "daily_limit" | "needs_approval"; detail: string };

export function precheck(user: string, feeUsdg: number): Precheck {
  const a = getAccount(user);
  if (feeUsdg > a.balanceUsdg) {
    return { ok: false, reason: "insufficient_balance", detail: `balance ${a.balanceUsdg.toFixed(2)} USDG < fee ${feeUsdg} USDG — top up the deposit wallet` };
  }
  const { dailyLimitUsdg, approvalThresholdUsdg, lowBalanceAlertUsdg } = a.budget;
  if (dailyLimitUsdg > 0 && a.spentTodayUsdg + feeUsdg > dailyLimitUsdg) {
    return { ok: false, reason: "daily_limit", detail: `daily limit ${dailyLimitUsdg} USDG reached (spent ${a.spentTodayUsdg.toFixed(2)}). Resets at UTC midnight.` };
  }
  if (approvalThresholdUsdg > 0 && feeUsdg > approvalThresholdUsdg) {
    return { ok: false, reason: "needs_approval", detail: `fee ${feeUsdg} USDG exceeds approval threshold ${approvalThresholdUsdg} USDG — human approval required` };
  }
  return { ok: true, warnLowBalance: a.balanceUsdg - feeUsdg <= lowBalanceAlertUsdg };
}

export function charge(user: string, feeUsdg: number): void {
  const a = getAccount(user);
  a.balanceUsdg = Number((a.balanceUsdg - feeUsdg).toFixed(6));
  a.spentTodayUsdg = Number((a.spentTodayUsdg + feeUsdg).toFixed(6));
}

export function setBudget(user: string, patch: Partial<BudgetConfig>): BudgetConfig {
  const a = getAccount(user);
  a.budget = { ...a.budget, ...patch };
  return a.budget;
}
