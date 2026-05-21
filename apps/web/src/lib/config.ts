import { getAddress, type Address } from "viem";

function requiredAddress(value: string | undefined, fallback: string): Address {
  return getAddress(value ?? fallback);
}

export const appConfig = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "0"),
  rpcUrl: process.env.ARC_RPC_URL ?? process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.io",
  tokenAddress: requiredAddress(
    process.env.NEXT_PUBLIC_TOKEN_ADDRESS,
    "0x0000000000000000000000000000000000000000"
  ),
  paymentContractAddress: requiredAddress(
    process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS,
    "0x0000000000000000000000000000000000000000"
  ),
  playFee: BigInt(process.env.NEXT_PUBLIC_PLAY_FEE ?? "0"),
  sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES ?? "30")
};
