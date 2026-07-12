export const CONFIG = {
  operatorKey: process.env.OPERATOR_PRIVATE_KEY ?? "",
  rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
  escrowAddress: process.env.SETTLEMENT_ESCROW_ADDRESS ?? "",
  registryAddress: process.env.VENDOR_REGISTRY_ADDRESS ?? "",
  reputationAddress: process.env.REPUTATION_ADDRESS ?? "",
};
