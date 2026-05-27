"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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

type Profile = {
  walletAddress: string;
  displayName: string | null;
};

type LeaderboardEntry = {
  id: string;
  walletAddress: string;
  displayName: string;
  score: number;
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
  const [error, setError] = useState("");
  const [hasInjectedWallet, setHasInjectedWallet] = useState(true);
  const [contractPlayFee, setContractPlayFee] = useState<bigint | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lastScoreStatus, setLastScoreStatus] = useState("");
  const [startNonce, setStartNonce] = useState(0);
  const [isRunPromptOpen, setIsRunPromptOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  const isWrongNetwork = isConnected && chainId !== arcTestnet.id;
  const hasInvalidTokenAddress = appConfig.tokenAddress.toLowerCase() === zeroAddress;
  const hasInvalidPaymentAddress = appConfig.paymentContractAddress.toLowerCase() === zeroAddress;
  const hasInvalidContractConfig = hasInvalidTokenAddress || hasInvalidPaymentAddress;
  const isBusy = ["loading", "approve-pending", "payment-pending", "verify-pending"].includes(gateState);
  const effectivePlayFee = contractPlayFee ?? appConfig.playFee;
  const hasSuspiciousUsdcFee = token.decimals === 6 && effectivePlayFee >= 1_000_000_000_000n;
  const hasEnoughToken = token.balance >= effectivePlayFee;
  const hasAllowance = token.allowance >= effectivePlayFee;
  const connector = connectors[0];

  const formattedBalance = useMemo(() => formatUnits(token.balance, token.decimals), [token.balance, token.decimals]);
  const formattedFee = useMemo(() => formatUnits(effectivePlayFee, token.decimals), [effectivePlayFee, token.decimals]);
  const runStatus = statusLabel(gateState);
  const canStartRun =
    isConnected &&
    Boolean(profile?.displayName) &&
    Boolean(address && walletClient && publicClient) &&
    !hasInvalidContractConfig &&
    !isWrongNetwork &&
    hasEnoughToken &&
    !isBusy;

  const loadLeaderboard = useCallback(async () => {
    const response = await fetch("/api/leaderboard", { method: "GET" });
    const payload = (await response.json()) as { ok: boolean; entries?: LeaderboardEntry[] };
    if (payload.ok && payload.entries) {
      setLeaderboard(payload.entries);
    }
  }, []);

  const refreshTokenState = useCallback(async () => {
    if (hasInvalidContractConfig) {
      setGateState("failed");
      setError("Token or payment contract address is not configured.");
      return;
    }

    if (!address || !publicClient || isWrongNetwork) {
      return;
    }

    setGateState((current) => (current === "unlocked" ? current : "loading"));
    setError("");

    try {
      const [balance, allowance, decimals, symbol, playFee] = await Promise.all([
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
        }),
        publicClient.readContract({
          address: appConfig.paymentContractAddress,
          abi: paymentContractAbi,
          functionName: "playFee"
        })
      ]);

      setToken({ balance, allowance, decimals, symbol });
      setContractPlayFee(playFee);
      setGateState((current) => {
        if (current === "unlocked") return current;
        return balance >= playFee ? "idle" : "insufficient-token";
      });
    } catch (caught) {
      setGateState("failed");
      setError(caught instanceof Error ? caught.message : "Failed to load token state.");
    }
  }, [address, hasInvalidContractConfig, isWrongNetwork, publicClient]);

  useEffect(() => {
    setHasInjectedWallet(typeof window !== "undefined" && "ethereum" in window);
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    let isMounted = true;

    async function recoverSession() {
      try {
        const response = await fetch("/api/session/current", { method: "GET" });
        const payload = (await response.json()) as { authenticated?: boolean };

        if (isMounted && payload.authenticated) {
          await fetch("/api/session/end", { method: "POST" });
          setLastScoreStatus("Previous unfinished run was closed. Pay again to start a new run.");
        }
      } catch {
        // Session recovery should not block the game menu.
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    }

    void recoverSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!address) {
        setProfile(null);
        setDisplayNameInput("");
        return;
      }

      const response = await fetch(`/api/profile?walletAddress=${address}`, { method: "GET" });
      const payload = (await response.json()) as { ok: boolean; profile?: Profile };
      if (payload.ok && payload.profile) {
        setProfile(payload.profile);
        setDisplayNameInput(payload.profile.displayName ?? "");
      }
    }

    void loadProfile();
  }, [address]);

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

  function requestRun() {
    setIsRunPromptOpen(true);
    setError("");
  }

  async function handlePlay() {
    if (!isConnected) {
      setError("Connect wallet before playing.");
      return;
    }
    if (!profile?.displayName) {
      setError("Create an ingame name before playing.");
      return;
    }
    if (!address || !walletClient || !publicClient) {
      setError("Wallet client is not ready.");
      return;
    }
    if (hasInvalidContractConfig) {
      setGateState("failed");
      setError("Token or payment contract address is not configured.");
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
    setLastScoreStatus("");

    try {
      if (!hasAllowance) {
        setGateState("approve-pending");
        const approveHash = await walletClient.writeContract({
          address: appConfig.tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [appConfig.paymentContractAddress, effectivePlayFee],
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
      setIsRunPromptOpen(false);
      setStartNonce((current) => current + 1);
    } catch (caught) {
      setGateState("failed");
      setError(caught instanceof Error ? caught.message : "Payment failed.");
      await refreshTokenState();
    }
  }

  async function handleSaveProfile() {
    if (!address) {
      setProfileError("Connect wallet before creating profile.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, displayName: displayNameInput })
      });
      const payload = (await response.json()) as { ok: boolean; profile?: Profile; error?: string };
      if (!response.ok || !payload.ok || !payload.profile) {
        throw new Error(payload.error ?? "Failed to save profile.");
      }
      setProfile(payload.profile);
      setDisplayNameInput(payload.profile.displayName ?? "");
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : "Failed to save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleGameOver(score: number) {
    setLastScoreStatus("Saving score...");

    try {
      const response = await fetch("/api/session/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score })
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to save score.");
      }

      setGateState("idle");
      setLastScoreStatus(`Score saved: ${score}`);
      await loadLeaderboard();
      await refreshTokenState();
    } catch (caught) {
      setLastScoreStatus(caught instanceof Error ? caught.message : "Failed to save score.");
    }
  }

  if (isCheckingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#efece1] px-5 py-8">
        <div className="-rotate-1 border-y-2 border-ink/15 bg-white/35 px-8 py-5 text-center shadow-[0_0_50px_rgba(45,125,102,0.18)] backdrop-blur-sm">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-mint">ARC Jump</p>
          <h1 className="mt-2 text-2xl font-black">Loading run...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#efece1] text-ink">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_18%_16%,rgba(45,125,102,0.22),transparent_30%),radial-gradient(circle_at_84%_82%,rgba(238,91,33,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 z-[11] bg-[radial-gradient(circle_at_center,transparent_45%,rgba(18,20,23,0.10)_82%,rgba(18,20,23,0.20)_100%)]" />
      <GamePlaceholder
        onGameOver={handleGameOver}
        onPlayRequest={requestRun}
        startNonce={startNonce}
      />

      <div className="pointer-events-none absolute left-4 top-4 z-20 flex max-w-[calc(100vw-32px)] flex-wrap items-center gap-3 sm:left-6 sm:top-5">
        <HudChip>
          <span className="text-[10px] uppercase tracking-[0.28em] text-mint">Run</span>
          <span className="text-sm font-black">{runStatus}</span>
        </HudChip>
        {lastScoreStatus ? <HudChip>{lastScoreStatus}</HudChip> : null}
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-20 flex max-w-[calc(100vw-32px)] items-start gap-2 sm:right-6 sm:top-5">
        <button
          type="button"
          onClick={() => setIsLeaderboardOpen(true)}
          className="pointer-events-auto -rotate-2 border-2 border-ink/20 bg-[#fff8da]/75 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] shadow-[4px_5px_0_rgba(18,20,23,0.14),0_0_28px_rgba(45,125,102,0.12)] backdrop-blur-sm transition hover:-translate-y-1 hover:rotate-0 hover:bg-[#fff8da]"
          title="Leaderboard"
        >
          Top
        </button>
        <div className="pointer-events-auto flex -rotate-1 items-center gap-2 border-2 border-ink/20 bg-white/55 px-3 py-2 shadow-[4px_5px_0_rgba(18,20,23,0.13)] backdrop-blur-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_16px_rgba(45,125,102,0.75)]" />
          <button
            type="button"
            onClick={() => setIsRunPromptOpen(true)}
            className="text-left text-xs font-black transition hover:text-mint"
          >
            {isConnected ? profile?.displayName || "P1" : "P1"}
          </button>
          {isConnected ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="border-l-2 border-ink/15 pl-2 text-[10px] font-black uppercase tracking-wide transition hover:text-danger"
            >
              Exit
            </button>
          ) : null}
        </div>
      </div>

      {isRunPromptOpen ? (
        <RunPrompt
          address={address}
          balance={`${formattedBalance} ${token.symbol}`}
          canStartRun={canStartRun}
          connectorReady={Boolean(connector && hasInjectedWallet)}
          displayNameInput={displayNameInput}
          error={error}
          fee={`${formattedFee} ${token.symbol}`}
          gateState={gateState}
          hasAllowance={hasAllowance}
          hasInvalidContractConfig={hasInvalidContractConfig}
          hasInjectedWallet={hasInjectedWallet}
          hasProfile={Boolean(profile?.displayName)}
          hasSuspiciousUsdcFee={hasSuspiciousUsdcFee}
          isConnected={isConnected}
          isConnectPending={isConnectPending}
          isSavingProfile={isSavingProfile}
          isSwitchPending={isSwitchPending}
          isWrongNetwork={isWrongNetwork}
          profileError={profileError}
          onClose={() => setIsRunPromptOpen(false)}
          onConnect={() => connector && connect({ connector })}
          onDisplayNameChange={setDisplayNameInput}
          onSaveProfile={handleSaveProfile}
          onStart={handlePlay}
          onSwitchNetwork={() => switchChainAsync({ chainId: arcTestnet.id })}
        />
      ) : null}

      {isLeaderboardOpen ? (
        <LeaderboardDrawer
          entries={leaderboard}
          onClose={() => setIsLeaderboardOpen(false)}
          onRefresh={loadLeaderboard}
        />
      ) : null}
    </main>
  );
}

function RunPrompt({
  address,
  balance,
  canStartRun,
  connectorReady,
  displayNameInput,
  error,
  fee,
  gateState,
  hasAllowance,
  hasInvalidContractConfig,
  hasInjectedWallet,
  hasProfile,
  hasSuspiciousUsdcFee,
  isConnected,
  isConnectPending,
  isSavingProfile,
  isSwitchPending,
  isWrongNetwork,
  profileError,
  onClose,
  onConnect,
  onDisplayNameChange,
  onSaveProfile,
  onStart,
  onSwitchNetwork
}: {
  address: Address | undefined;
  balance: string;
  canStartRun: boolean;
  connectorReady: boolean;
  displayNameInput: string;
  error: string;
  fee: string;
  gateState: GateState;
  hasAllowance: boolean;
  hasInvalidContractConfig: boolean;
  hasInjectedWallet: boolean;
  hasProfile: boolean;
  hasSuspiciousUsdcFee: boolean;
  isConnected: boolean;
  isConnectPending: boolean;
  isSavingProfile: boolean;
  isSwitchPending: boolean;
  isWrongNetwork: boolean;
  profileError: string;
  onClose: () => void;
  onConnect: () => void;
  onDisplayNameChange: (value: string) => void;
  onSaveProfile: () => void;
  onStart: () => void;
  onSwitchNetwork: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-ink/20 px-4 backdrop-blur-[2px]">
      <section className="w-[min(440px,100%)] -rotate-1 border-2 border-ink/20 bg-[#fffdf4]/90 p-5 shadow-[8px_10px_0_rgba(18,20,23,0.16),0_0_70px_rgba(45,125,102,0.22)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-mint">Next run</p>
            <h2 className="mt-1 text-3xl font-black">Ranked Run</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-ink/15 bg-white/45 px-3 py-1 text-sm font-black transition hover:bg-ink hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-5 border-y-2 border-dashed border-ink/15 bg-white/35 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-bold text-ink/60">Entry</span>
            <span className="font-black text-mint">{fee}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 text-sm">
            <span className="font-bold text-ink/60">Pocket</span>
            <span className="font-black">{isConnected ? balance : "Not connected"}</span>
          </div>
          {isConnected && address ? (
            <p className="mt-3 text-xs font-bold text-ink/50">{compactAddress(address)}</p>
          ) : null}
        </div>

        {!isConnected ? (
          <ActionBlock
            title="Connect to enter"
            body={
              hasInjectedWallet
                ? "Your wallet becomes your game account."
                : "MetaMask or another injected EVM wallet is needed for ranked runs."
            }
          >
            <button
              type="button"
              disabled={!connectorReady || isConnectPending}
              onClick={onConnect}
              className="arcade-button w-full"
            >
              {isConnectPending ? "Connecting..." : "Connect Wallet"}
            </button>
          </ActionBlock>
        ) : null}

        {isConnected && !hasProfile ? (
          <ActionBlock title="Pick your name" body="This name can change later, but your wallet remains the same account.">
            <div className="flex gap-2">
              <input
                type="text"
                value={displayNameInput}
                onChange={(event) => onDisplayNameChange(event.target.value)}
                placeholder="Ingame name"
                maxLength={20}
                className="min-h-12 min-w-0 flex-1 border-2 border-ink/15 bg-white/70 px-4 font-bold outline-none transition focus:border-mint/60"
              />
              <button
                type="button"
                disabled={isSavingProfile}
                onClick={onSaveProfile}
                className="bg-ink px-5 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingProfile ? "Saving" : "Save"}
              </button>
            </div>
            {profileError ? <p className="mt-2 text-sm font-bold text-danger">{profileError}</p> : null}
          </ActionBlock>
        ) : null}

        {isConnected && isWrongNetwork ? (
          <ActionBlock title="Switch arena" body="Ranked runs are currently on Arc Testnet.">
            <button
              type="button"
              disabled={isSwitchPending}
              onClick={onSwitchNetwork}
              className="arcade-button w-full"
            >
              {isSwitchPending ? "Switching..." : "Switch Network"}
            </button>
          </ActionBlock>
        ) : null}

        {hasInvalidContractConfig ? (
          <Notice tone="danger" title="Run config missing">
            Token or payment contract address is not configured.
          </Notice>
        ) : null}
        {hasSuspiciousUsdcFee ? (
          <Notice tone="warning" title="Entry fee looks huge">
            Arc USDC uses 6 decimals. 1 USDC should be 1000000 on-chain units.
          </Notice>
        ) : null}
        {error ? <Notice tone="danger" title="Run blocked">{error}</Notice> : null}

        <button
          type="button"
          disabled={!canStartRun}
          onClick={onStart}
          className="arcade-button mt-5 w-full text-lg"
        >
          {buttonLabel(gateState, hasAllowance)}
        </button>
        <p className="mt-3 text-center text-xs font-bold text-ink/45">
          One paid entry unlocks one run. Game over closes the session.
        </p>
      </section>
    </div>
  );
}

function LeaderboardDrawer({
  entries,
  onClose,
  onRefresh
}: {
  entries: LeaderboardEntry[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  useEffect(() => {
    void onRefresh();
  }, [onRefresh]);

  return (
    <div className="absolute inset-0 z-30 bg-ink/20 backdrop-blur-[2px]">
      <aside className="absolute right-4 top-4 h-[calc(100%-32px)] w-[min(360px,calc(100vw-32px))] -rotate-1 border-2 border-ink/20 bg-[#fffdf4]/90 p-5 shadow-[8px_10px_0_rgba(18,20,23,0.16),0_0_70px_rgba(45,125,102,0.2)] backdrop-blur-sm transition">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-mint">Top runners</p>
            <h2 className="mt-1 text-3xl font-black">Leaderboard</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-ink/15 bg-white/45 px-3 py-1 text-sm font-black transition hover:bg-ink hover:text-white"
          >
            Close
          </button>
        </div>

        <ol className="mt-6 space-y-3">
          {entries.length ? (
            entries.map((entry, index) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 border-b-2 border-dashed border-ink/10 bg-white/35 px-3 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center bg-ink text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="truncate font-black">{entry.displayName}</span>
                </span>
                <span className="font-black text-mint">{entry.score}</span>
              </li>
            ))
          ) : (
            <li className="border-2 border-dashed border-ink/10 bg-white/35 p-4 text-sm font-bold text-ink/55">
              No scores yet.
            </li>
          )}
        </ol>
      </aside>
    </div>
  );
}

function HudChip({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto flex min-h-9 -rotate-1 items-center gap-2 border-y-2 border-ink/20 bg-white/35 px-3 py-1.5 text-sm font-black shadow-[4px_5px_0_rgba(18,20,23,0.12)] backdrop-blur-sm">
      {children}
    </div>
  );
}

function ActionBlock({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="mt-4 border-2 border-dashed border-ink/15 bg-white/35 p-4">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-1 text-sm font-bold leading-6 text-ink/55">{body}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Notice({
  title,
  tone,
  children
}: {
  title: string;
  tone: "warning" | "danger" | "neutral";
  children: ReactNode;
}) {
  const className =
    tone === "danger"
      ? "border-danger/30 bg-red-50 text-danger"
      : tone === "warning"
        ? "border-amber/30 bg-yellow-50 text-amber"
        : "border-ink/10 bg-white text-ink";

  return (
    <div className={`mt-3 border-2 p-3 text-sm font-bold leading-6 ${className}`}>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-ink/70">{children}</p>
    </div>
  );
}

function compactAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function buttonLabel(gateState: GateState, hasAllowance: boolean) {
  if (gateState === "approve-pending") return "Approving Entry...";
  if (gateState === "payment-pending") return "Opening Gate...";
  if (gateState === "verify-pending") return "Locking In...";
  if (gateState === "loading") return "Checking...";
  if (gateState === "insufficient-token") return "Not Enough Tokens";
  return hasAllowance ? "Start Match" : "Approve and Start";
}

function statusLabel(gateState: GateState) {
  if (gateState === "idle") return "Ready";
  if (gateState === "unlocked") return "In run";
  return gateState
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
