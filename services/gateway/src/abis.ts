/** SettlementEscrow ABI subset the gateway operator needs: charge + revert errors. */
export const escrowAbi = [
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
  { type: "error", name: "NotOperator", inputs: [] },
  { type: "error", name: "InsufficientBalance", inputs: [] },
  { type: "error", name: "DailyLimitExceeded", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
] as const;
