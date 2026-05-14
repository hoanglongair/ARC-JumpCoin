import { createPublicClient, getAddress, http, parseEventLogs, type Hash } from "viem";
import { appConfig } from "@/lib/config";
import { paymentContractAbi } from "@/lib/contracts";
import { arcTestnet } from "@/lib/chains";

export type VerifiedPayment = {
  txHash: Hash;
  walletAddress: string;
  amount: bigint;
};

export async function verifyPaymentOnchain(txHash: Hash, walletAddress: string): Promise<VerifiedPayment> {
  const expectedWallet = getAddress(walletAddress);
  const expectedContract = getAddress(appConfig.paymentContractAddress);

  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(appConfig.rpcUrl)
  });

  const [transaction, receipt] = await Promise.all([
    client.getTransaction({ hash: txHash }),
    client.getTransactionReceipt({ hash: txHash })
  ]);

  if (receipt.status !== "success") {
    throw new Error("Transaction did not succeed.");
  }

  if (!transaction.to || getAddress(transaction.to) !== expectedContract) {
    throw new Error("Transaction target is not the payment contract.");
  }

  if (getAddress(transaction.from) !== expectedWallet) {
    throw new Error("Transaction sender does not match wallet.");
  }

  const logs = parseEventLogs({
    abi: paymentContractAbi,
    eventName: "PaymentReceived",
    logs: receipt.logs
  });

  const paymentLog = logs.find((log) => {
    return (
      getAddress(log.address) === expectedContract &&
      getAddress(log.args.payer) === expectedWallet &&
      log.args.amount === appConfig.playFee
    );
  });

  if (!paymentLog) {
    throw new Error("Valid payment event was not found.");
  }

  return {
    txHash,
    walletAddress: expectedWallet,
    amount: paymentLog.args.amount
  };
}
