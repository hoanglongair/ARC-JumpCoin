"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, type Address, type Hash } from "viem";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWalletClient
} from "wagmi";
import { GamePlaceholder } from "@/components/game-placeholder";
import { arcTestnet } from "@/lib/chains";
import { appConfig } from "@/lib/config";
import { erc20Abi, paymentContractAbi } from "@/lib/contracts";

type GateState =
  | "idle"
  | "loading"
  | "wrong-network"
  | "insufficient-token"
  | "approve-pending"
  | "payment-pending"
  | "verify-pending"
  | "unlocked"
  | "failed";

type TokenSnapshot = {
  balance: bigint;
  allowance: bigint;
  decimals: number;
  symbol: string;
};

const defaultTokenSnapshot: TokenSnapshot = {
  balance: 0n,
  allowance: 0n,
  decimals: 18,
  symbol: "TOKEN"
};

const zeroAddress = "0x0000000000000000000000000000000000000000";

export function PaymentGate() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchPending } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { data: walletClient } = useWalletClient({ chainId: arcTestnet.id });
  const [token, setToken] = useState<TokenSnapshot>(defaultTokenSnapshot);
  const [gateState, setGateState] = useState<GateState>("idle");
  const [error, setError] = useState<string>("");
  const [hasInjectedWallet, setHasInjectedWallet] = useState(true);

  const isWrongNetwork = isConnected && chainId !== arcTestnet.id;
  const hasInvalidTokenAddress = appConfig.tokenAddress.toLowerCase() === zeroAddress;
  const hasInvalidPaymentAddress = appConfig.paymentContractAddress.toLowerCase() === zeroAddress;
  const hasInvalidContractConfig = hasInvalidTokenAddress || hasInvalidPaymentAddress;
  const isBusy = ["loading", "approve-pending", "payment-pending", "verify-pending"].includes(gateState);
  const hasEnoughToken = token.balance >= appConfig.playFee;
  const hasAllowance = token.allowance >= appConfig.playFee;

  const connector = connectors[0];

  useEffect(() => {
    setHasInjectedWallet(typeof window !== "undefined" && "ethereum" in window);
  }, []);

  const formattedBalance = useMemo(() => {
    return formatUnits(token.balance, token.decimals);
  }, [token.balance, token.decimals]);

  const formattedFee = useMemo(() => {
    return formatUnits(appConfig.playFee, token.decimals);
  }, [token.decimals]);

  const refreshTokenState = useCallback(async () => {
    if (hasInvalidContractConfig) {
      setGateState("failed");
      setError("Token or payment contract address is not configured. Check NEXT_PUBLIC_TOKEN_ADDRESS and NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS, then rebuild the app.");
      return;
    }

    if (!address || !publicClient || isWrongNetwork) {
      return;
    }

    setGateState("loading");
    setError("");

    try {
      const [balance, allowance, decimals, symbol] = await Promise.all([
        publicClient.readContract({
          address: appConfig.tokenAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address]
        }),
        publicClient.readContract({
          address: appConfig.tokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, appConfig.paymentContractAddress]
        }),
        publicClient.readContract({
          address: appConfig.tokenAddress,
          abi: erc20Abi,
          functionName: "decimals"
        }),
        publicClient.readContract({
          address: appConfig.tokenAddress,
          abi: erc20Abi,
          functionName: "symbol"
        })
      ]);

      setToken({ balance, allowance, decimals, symbol });
      setGateState(balance >= appConfig.playFee ? "idle" : "insufficient-token");
    } catch (caught) {
      setGateState("failed");
      setError(caught instanceof Error ? caught.message : "Failed to load token state.");
    }
  }, [address, hasInvalidContractConfig, isWrongNetwork, publicClient]);

  useEffect(() => {
    if (!isConnected) {
      setGateState("idle");
      setToken(defaultTokenSnapshot);
      return;
    }

    if (isWrongNetwork) {
      setGateState("wrong-network");
      return;
    }

    void refreshTokenState();
  }, [isConnected, isWrongNetwork, refreshTokenState]);

  async function verifyPayment(txHash: Hash) {
    const response = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, walletAddress: address })
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? "Payment verification failed.");
    }
  }

  async function handlePlay() {
    if (!address || !walletClient || !publicClient) {
      setError("Connect a wallet before playing.");
      return;
    }

    if (hasInvalidContractConfig) {
      setGateState("failed");
      setError("Token or payment contract address is not configured. Check NEXT_PUBLIC_TOKEN_ADDRESS and NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS, then rebuild the app.");
      return;
    }

    if (isWrongNetwork) {
      await switchChainAsync({ chainId: arcTestnet.id });
      return;
    }

    if (!hasEnoughToken) {
      setGateState("insufficient-token");
      return;
    }

    setError("");

    try {
      if (!hasAllowance) {
        setGateState("approve-pending");
        const approveHash = await walletClient.writeContract({
          address: appConfig.tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [appConfig.paymentContractAddress, appConfig.playFee],
          chain: arcTestnet,
          account: address
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setGateState("payment-pending");
      const paymentHash = await walletClient.writeContract({
        address: appConfig.paymentContractAddress,
        abi: paymentContractAbi,
        functionName: "pay",
        chain: arcTestnet,
        account: address
      });
      await publicClient.waitForTransactionReceipt({ hash: paymentHash });

      setGateState("verify-pending");
      await verifyPayment(paymentHash);
      setGateState("unlocked");
    } catch (caught) {
      setGateState("failed");
      setError(caught instanceof Error ? caught.message : "Payment failed.");
      await refreshTokenState();
    }
  }

  async function handleEndSession() {
    await fetch("/api/session/end", { method: "POST" });
    setGateState("idle");
    await refreshTokenState();
  }

  if (gateState === "unlocked") {
    return <GamePlaceholder onEnd={handleEndSession} />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-8">
      <section className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-line bg-panel p-6 shadow-sm">
          <p className="text-sm uppercase tracking-wide text-mint">Payment gate</p>
          <h1 className="mt-2 text-4xl font-semibold">ARC JumpCoin</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-black/70">
            Pay one verified token fee to unlock one game session. The backend verifies the Arc transaction
            before access is granted.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {!isConnected ? (
              <button
                type="button"
                disabled={!connector || !hasInjectedWallet || isConnectPending}
                onClick={() => connector && connect({ connector })}
                className="rounded-md bg-ink px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConnectPending ? "Connecting..." : "Connect wallet"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={hasInvalidContractConfig || isBusy || gateState === "insufficient-token"}
                  onClick={handlePlay}
                  className="rounded-md bg-mint px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {buttonLabel(gateState, hasAllowance)}
                </button>
                <button
                  type="button"
                  disabled={isSwitchPending || !isWrongNetwork}
                  onClick={() => switchChainAsync({ chainId: arcTestnet.id })}
                  className="rounded-md border border-line bg-white px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Switch network
                </button>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="rounded-md border border-line bg-white px-5 py-3 font-semibold"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>

          {!isConnected && !hasInjectedWallet ? (
            <div className="mt-5 rounded-md border border-amber/30 bg-yellow-50 p-4 text-sm leading-6 text-amber">
              <p className="font-semibold">No wallet extension detected.</p>
              <p className="mt-1 text-black/70">
                Install MetaMask or another injected EVM wallet, then refresh this page to connect.
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-md border border-amber/40 bg-white px-3 py-2 font-semibold text-amber hover:bg-yellow-100"
              >
                Install MetaMask
              </a>
            </div>
          ) : null}

          {hasInvalidContractConfig ? (
            <div className="mt-5 rounded-md border border-danger/30 bg-red-50 p-4 text-sm leading-6 text-danger">
              <p className="font-semibold">Contract configuration is missing.</p>
              <p className="mt-1">
                Set `NEXT_PUBLIC_TOKEN_ADDRESS` and `NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS` to deployed contract
                addresses, then restart local dev or redeploy Vercel.
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-5 rounded-md border border-danger/30 bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
        </div>

        <aside className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Session requirements</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <StatusRow label="Wallet" value={address ? compactAddress(address) : "Not connected"} ok={isConnected} />
            <StatusRow label="Network" value={isWrongNetwork ? "Wrong network" : arcTestnet.name} ok={isConnected && !isWrongNetwork} />
            <StatusRow label="Balance" value={`${formattedBalance} ${token.symbol}`} ok={hasEnoughToken} />
            <StatusRow label="Play fee" value={`${formattedFee} ${token.symbol}`} ok />
            <StatusRow label="Allowance" value={hasAllowance ? "Ready" : "Approval needed"} ok={hasAllowance} />
            <StatusRow label="Status" value={statusLabel(gateState)} ok={!["failed", "wrong-network", "insufficient-token"].includes(gateState)} />
          </dl>
        </aside>
      </section>
    </main>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-black/60">{label}</dt>
      <dd className={ok ? "font-medium text-mint" : "font-medium text-amber"}>{value}</dd>
    </div>
  );
}

function compactAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function buttonLabel(gateState: GateState, hasAllowance: boolean) {
  if (gateState === "approve-pending") return "Approving...";
  if (gateState === "payment-pending") return "Paying...";
  if (gateState === "verify-pending") return "Verifying...";
  if (gateState === "loading") return "Loading...";
  return hasAllowance ? "Pay and play" : "Approve and play";
}

function statusLabel(gateState: GateState) {
  return gateState
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
