/** Minimal ABIs for the dashboard's onchain reads and writes. */

export const usdgAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const escrowAbi = [
  {
    type: "function",
    name: "balances",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "configs",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "dailyLimit", type: "uint128" },
      { name: "spentToday", type: "uint128" },
      { name: "day", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setDailyLimit",
    stateMutability: "nonpayable",
    inputs: [{ name: "limit", type: "uint128" }],
    outputs: [],
  },
  {
    type: "function",
    name: "operator",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "charge",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "vendorId", type: "bytes32" },
      { name: "vendorPayout", type: "address" },
      { name: "fee", type: "uint256" },
      { name: "success", type: "bool" },
      { name: "latencyMs", type: "uint32" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Charged",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "vendorId", type: "bytes32", indexed: true },
      { name: "vendorPayout", type: "address", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
      { name: "protocolCut", type: "uint256", indexed: false },
      { name: "success", type: "bool", indexed: false },
      { name: "latencyMs", type: "uint32", indexed: false },
    ],
  },
  { type: "error", name: "InsufficientBalance", inputs: [] },
  { type: "error", name: "DailyLimitExceeded", inputs: [] },
  { type: "error", name: "NotOperator", inputs: [] },
] as const;
