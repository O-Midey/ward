"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useWalletStore } from "@/store/wallet";
import { useActivityStore } from "@/store/activity";
import { getBalance, type BalanceResult } from "@/layers/chain";
import {
  getTokenBalances,
  getNFTs,
  getTransferHistory,
} from "@/layers/services";
import { SUPPORTED_CHAINS } from "@/lib/types";
import type {
  TokenBalance,
  NFTAsset,
  ActivityTx,
  HistoryItem,
  SendAsset,
} from "@/lib/types";
import { Icon, Button } from "@/components/ui";
import {
  formatAmount,
  formatTokenBalance,
  shortAddress,
  timeAgo,
} from "@/lib/format";
import type { TxStatus } from "@/hooks/useSendTransaction";

interface HomeScreenProps {
  onSend: () => void;
  onSendAsset: (asset: SendAsset) => void;
  onReceive: () => void;
  onSettings: () => void;
  txHash: `0x${string}` | null;
  txStatus: TxStatus;
  txError: string | null;
  dismissTx: () => void;
}

const EASE = [0.22, 0.61, 0.36, 1] as const;
type Tab = "tokens" | "nfts" | "activity";

// Deterministic hue from a string — makes every token fallback feel intentional
function tokenHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 37 + str.charCodeAt(i)) % 360;
  return h;
}

export function HomeScreen({
  onSend,
  onSendAsset,
  onReceive,
  onSettings,
  txHash,
  txStatus,
  txError,
  dismissTx,
}: HomeScreenProps) {
  const {
    accounts,
    activeAccountIndex,
    activeChain,
    switchAccount,
    switchChain,
    addAccount,
  } = useWalletStore();
  const loadActivity = useActivityStore((s) => s.loadFor);
  const reconcileActivity = useActivityStore((s) => s.reconcile);
  const pendingTxs = useActivityStore((s) => s.txs);
  const account = accounts[activeAccountIndex];
  const [tab, setTab] = useState<Tab>("tokens");
  const [showAccts, setShowAccts] = useState(false);
  const [showChains, setShowChains] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account/chain menus on outside click or Escape.
  const menusOpen = showAccts || showChains;
  useEffect(() => {
    if (!menusOpen) return;
    const close = () => {
      setShowAccts(false);
      setShowChains(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menusOpen]);

  const {
    data: balance,
    isLoading: balLoading,
    isError: balError,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["balance", account?.address, activeChain.id],
    queryFn: () => getBalance(account!.address, activeChain),
    enabled: !!account,
    refetchInterval: 15_000,
  });

  // Native balance for every account so the switcher shows which are funded.
  // Shares cache with the active-account query above (identical query keys).
  const accountBalances = useQueries({
    queries: accounts.map((a) => ({
      queryKey: ["balance", a.address, activeChain.id],
      queryFn: () => getBalance(a.address, activeChain),
      enabled: !!account,
      refetchInterval: 15_000,
    })),
  });

  const handleAddAccount = async () => {
    if (addingAccount) return;
    setAddingAccount(true);
    try {
      const created = await addAccount();
      switchAccount(created.index);
      setShowAccts(false);
    } finally {
      setAddingAccount(false);
    }
  };

  const {
    data: tokens,
    isLoading: tokensLoading,
    isError: tokensError,
    refetch: refetchTokens,
  } = useQuery({
    queryKey: ["tokens", account?.address, activeChain.id],
    queryFn: () => getTokenBalances(account!.address, activeChain),
    enabled: !!account,
    staleTime: 30_000,
  });

  const {
    data: nfts,
    isLoading: nftsLoading,
    isError: nftsError,
    refetch: refetchNfts,
  } = useQuery({
    queryKey: ["nfts", account?.address, activeChain.id],
    queryFn: () => getNFTs(account!.address, activeChain),
    enabled: !!account,
    staleTime: 60_000,
  });

  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["history", account?.address, activeChain.id],
    queryFn: () => getTransferHistory(account!.address, activeChain),
    enabled: !!account,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!account) return;
    loadActivity(account.address, activeChain.id);
    reconcileActivity(activeChain).catch(() => {});
  }, [account, activeChain, loadActivity, reconcileActivity]);

  if (!account) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="h-full flex flex-col"
      style={{ paddingTop: "var(--ward-safe-top)" }}
    >
      {/* Header + switchers (outside-click closes these) */}
      <div ref={menuRef}>
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowAccts((v) => !v);
                setShowChains(false);
              }}
              className="flex items-center gap-2 press min-w-0"
              aria-expanded={showAccts}
              aria-label="Switch account"
            >
              <span className="font-display text-lg text-text truncate">
                {account.name}
              </span>
              <motion.span
                animate={{ rotate: showAccts ? 180 : 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="shrink-0 text-text-tertiary"
              >
                <Icon name="chevron-down" size={15} />
              </motion.span>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setShowChains((v) => !v);
                  setShowAccts(false);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-text-secondary bg-surface px-3 py-1.5 rounded-full press"
                style={{ boxShadow: "var(--shadow-card)" }}
                aria-expanded={showChains}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {activeChain.shortName}
                <Icon
                  name="chevron-down"
                  size={11}
                  className="text-text-tertiary"
                />
              </button>
              <button
                onClick={onSettings}
                aria-label="Settings"
                className="press w-8 h-8 flex items-center justify-center rounded-full bg-surface text-text-tertiary hover:text-text"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <Icon name="settings" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Account switcher */}
        <Dropdown open={showAccts}>
          {accounts.map((a, i) => {
            const bal = accountBalances[i];
            return (
              <RowButton
                key={a.address}
                active={i === activeAccountIndex}
                onClick={() => {
                  switchAccount(i);
                  setShowAccts(false);
                }}
                title={a.name}
                subtitle={shortAddress(a.address, 8, 6)}
                value={
                  bal?.data
                    ? `${formatAmount(bal.data.formatted)} ${activeChain.nativeToken}`
                    : undefined
                }
                loading={bal?.isLoading}
              />
            );
          })}
          <button
            onClick={handleAddAccount}
            disabled={addingAccount}
            className="w-full px-4 py-3 flex items-center gap-2 text-left text-accent hover:bg-accent-soft transition-colors disabled:opacity-50"
          >
            {addingAccount ? (
              <span className="w-[15px] h-[15px] rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            ) : (
              <Icon name="plus" size={15} className="shrink-0" />
            )}
            <span className="text-sm font-medium">
              {addingAccount ? "Adding…" : "Add account"}
            </span>
          </button>
        </Dropdown>

        {/* Chain switcher */}
        <Dropdown open={showChains}>
          {SUPPORTED_CHAINS.map((c) => (
            <RowButton
              key={c.id}
              active={c.id === activeChain.id}
              onClick={() => {
                switchChain(c.id);
                setShowChains(false);
              }}
              title={c.name}
              subtitle={c.nativeToken}
            />
          ))}
        </Dropdown>
      </div>

      {/* Balance hero */}
      <div className="px-5 pt-1 pb-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.5, ease: EASE }}
          className="relative overflow-hidden rounded-[var(--radius-xl)] px-6 pt-6 pb-6 hero-noise surface-shine"
          style={{
            background: "var(--grad-hero)",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          {/* Glow orbs */}
          <div
            className="absolute -top-16 -right-10 w-52 h-52 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(147,197,253,0.18) 0%, transparent 70%)",
              animation: "glow-pulse 4s ease-in-out infinite",
            }}
          />
          <div
            className="absolute -bottom-10 -left-8 w-36 h-36 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
              animation: "glow-pulse 4s ease-in-out infinite 2s",
            }}
          />

          <p className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-white/60 mb-1">
            Total balance
          </p>

          {balLoading ? (
            <div className="h-14 w-48 rounded-xl mt-1 bg-white/10 animate-pulse" />
          ) : balError && !balance ? (
            // Don't show a fake "0" on a failed fetch — that reads as an empty
            // wallet. Surface the failure with a retry instead.
            <button
              onClick={() => refetchBalance()}
              className="flex items-center gap-2 mt-2 text-white/85 press"
            >
              <Icon name="alert" size={18} className="shrink-0" />
              <span className="text-sm font-medium">
                Couldn&apos;t load balance · Tap to retry
              </span>
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-baseline gap-2.5 mt-0.5"
            >
              <span className="font-display tabular-nums text-[3.25rem] leading-none text-white font-semibold tracking-tight">
                {balance ? formatAmount(balance.formatted) : "0"}
              </span>
              <span className="font-display text-xl text-white/70 font-medium">
                {activeChain.nativeToken}
              </span>
            </motion.div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[0.7rem] font-mono tracking-wider text-white/50">
              {shortAddress(account.address, 10, 8)}
            </span>
            <span className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full text-white/50 border border-white/10">
              Testnet
            </span>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-3">
        <Button fullWidth icon="arrow-up" onClick={onSend}>
          Send
        </Button>
        <Button
          fullWidth
          variant="secondary"
          icon="arrow-down"
          onClick={onReceive}
        >
          Receive
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-1 mb-1">
        {(["tokens", "nfts", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2 text-[0.8125rem] font-semibold rounded-full transition-colors capitalize ${
              tab === t
                ? "text-accent bg-accent-soft"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {tab === "tokens" && (
              <TokenList
                nativeBalance={balance}
                tokens={tokens}
                loading={tokensLoading}
                error={tokensError}
                onRetry={refetchTokens}
                chain={activeChain}
                onSendAsset={onSendAsset}
              />
            )}
            {tab === "nfts" && (
              <NFTGrid
                nfts={nfts}
                loading={nftsLoading}
                error={nftsError}
                onRetry={refetchNfts}
                onSendAsset={onSendAsset}
              />
            )}
            {tab === "activity" && (
              <ActivityList
                history={history}
                pending={pendingTxs}
                loading={historyLoading}
                error={historyError}
                onRetry={refetchHistory}
                explorerUrl={activeChain.explorerUrl}
                chainId={activeChain.id}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {(txStatus === "broadcasting" ||
          txStatus === "confirmed" ||
          txStatus === "failed") && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[92%] z-50"
          >
            <TxToast
              status={txStatus}
              hash={txHash}
              error={txError}
              onDismiss={dismissTx}
              explorerUrl={activeChain.explorerUrl}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <nav
        className="absolute bottom-0 left-0 right-0 chrome-blur"
        style={{ boxShadow: "0 -1px 0 var(--c-border)" }}
      >
        <div className="flex items-center justify-around h-[3.75rem] px-4 pb-[env(safe-area-inset-bottom,0px)]">
          <NavItem icon="home" label="Home" active />
          <button
            onClick={onSend}
            className="flex flex-col items-center gap-1 press"
            style={{ marginTop: "-2.25rem", zIndex: 10, position: "relative" }}
            aria-label="Send"
          >
            <span
              className="w-14 h-14 rounded-full flex items-center justify-center text-[var(--c-on-accent)] relative overflow-hidden surface-shine"
              style={{
                background: "var(--grad-accent)",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              <Icon name="arrow-up" size={22} strokeWidth={2} />
            </span>
          </button>
          <button
            onClick={onReceive}
            className="flex flex-col items-center gap-1 press text-text-tertiary hover:text-text"
            aria-label="Receive"
          >
            <Icon name="arrow-down" size={22} />
            <span className="text-[10px] font-medium">Receive</span>
          </button>
        </div>
      </nav>
    </motion.div>
  );
}

// ---- Dropdown ----

function Dropdown({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="px-5 overflow-hidden"
        >
          <div className="card overflow-hidden mb-2">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RowButton({
  active,
  onClick,
  title,
  subtitle,
  value,
  loading,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  value?: string;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-accent-soft transition-colors border-b border-[var(--c-border)] last:border-0"
    >
      <div className="min-w-0">
        <div className="text-sm text-text font-medium truncate">{title}</div>
        <div className="text-xs text-text-tertiary mt-0.5 font-mono">
          {subtitle}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {loading ? (
          <span className="h-3.5 w-12 rounded bg-surface-2 animate-pulse" />
        ) : value !== undefined ? (
          <span className="text-xs font-mono tabular-nums text-text-secondary">
            {value}
          </span>
        ) : null}
        {active && (
          <Icon name="check" size={15} className="text-accent shrink-0" />
        )}
      </div>
    </button>
  );
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: "home";
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${active ? "text-accent" : "text-text-tertiary"}`}
    >
      <Icon name={icon} size={22} />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

// ---- Token list ----

function TokenList({
  nativeBalance,
  tokens,
  loading,
  error,
  onRetry,
  chain,
  onSendAsset,
}: {
  nativeBalance: BalanceResult | undefined;
  tokens: TokenBalance[] | undefined;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  chain: { nativeToken: string };
  onSendAsset: (asset: SendAsset) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton h-[4.5rem] rounded-[var(--radius-lg)]"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {/* Native balance always renders — it comes from the chain RPC, not the indexer. */}
      <Asset
        logo={null}
        fallback={chain.nativeToken.slice(0, 3)}
        name={chain.nativeToken}
        sub="Tap to send"
        right={nativeBalance ? formatAmount(nativeBalance.formatted) : "0"}
        accentFallback
        onClick={() => onSendAsset({ kind: "native" })}
      />
      {tokens?.map((t) => (
        <Asset
          key={t.contractAddress}
          logo={t.logo}
          fallback={t.symbol.slice(0, 3)}
          name={t.name}
          sub={t.symbol}
          right={formatTokenBalance(t.balance, t.decimals)}
          hue={tokenHue(t.symbol)}
          onClick={() => onSendAsset({ kind: "erc20", token: t })}
        />
      ))}
      {error ? (
        <FetchError what="tokens" onRetry={onRetry} />
      ) : (
        (!tokens || tokens.length === 0) && (
          <Empty
            icon="wallet"
            text="No tokens yet"
            sub="Tokens on this network will appear here"
          />
        )
      )}
    </div>
  );
}

function Asset({
  logo,
  fallback,
  name,
  sub,
  right,
  accentFallback,
  hue,
  onClick,
}: {
  logo: string | null | undefined;
  fallback: string;
  name: string;
  sub: string;
  right: string;
  accentFallback?: boolean;
  hue?: number;
  onClick?: () => void;
}) {
  const fallbackStyle =
    hue !== undefined
      ? {
          background: `hsl(${hue} 60% 50% / 0.14)`,
          color: `hsl(${hue} 65% 52%)`,
        }
      : accentFallback
        ? undefined
        : { background: "var(--c-surface-2)", color: "var(--c-text-tertiary)" };

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center justify-between py-3.5 px-4 card press"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="w-10 h-10 rounded-full shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${accentFallback ? "bg-accent-soft text-accent" : ""}`}
            style={fallbackStyle}
          >
            <span className="text-[0.7rem] font-bold font-mono">
              {fallback}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[0.875rem] font-semibold text-text truncate">
            {name}
          </div>
          <div className="text-xs text-text-tertiary truncate mt-0.5">
            {sub}
          </div>
        </div>
      </div>
      <div className="text-[0.875rem] font-semibold text-text tabular-nums shrink-0 ml-3">
        {right}
      </div>
    </button>
  );
}

// ---- NFT grid ----

function NFTGrid({
  nfts,
  loading,
  error,
  onRetry,
  onSendAsset,
}: {
  nfts: NFTAsset[] | undefined;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  onSendAsset: (asset: SendAsset) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton aspect-square rounded-[var(--radius-lg)]"
          />
        ))}
      </div>
    );
  }
  if (error) return <FetchError what="NFTs" onRetry={onRetry} />;
  if (!nfts || nfts.length === 0)
    return (
      <Empty
        icon="sparkle"
        text="No NFTs yet"
        sub="NFTs on this network will appear here"
      />
    );
  return (
    <div className="grid grid-cols-2 gap-3">
      {nfts.map((nft, i) => (
        <motion.button
          key={`${nft.contractAddress}-${nft.tokenId}`}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, duration: 0.3, ease: EASE }}
          onClick={() => onSendAsset({ kind: "erc721", nft })}
          className="card overflow-hidden text-left press"
        >
          {nft.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nft.image}
              alt={nft.name || ""}
              className="w-full aspect-square object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="aspect-square flex items-center justify-center bg-surface-2 text-text-tertiary">
              <Icon name="sparkle" size={28} strokeWidth={1.5} />
            </div>
          )}
          <div className="px-3 py-2.5">
            <div className="text-[0.8125rem] text-text font-semibold truncate">
              {nft.name || `#${nft.tokenId.slice(0, 8)}`}
            </div>
            {nft.collection && (
              <div className="text-[0.7rem] text-text-tertiary truncate mt-0.5">
                {nft.collection}
              </div>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// ---- Activity list ----

function ActivityList({
  history,
  pending,
  loading,
  error,
  onRetry,
  explorerUrl,
  chainId,
}: {
  history: HistoryItem[] | undefined;
  pending: ActivityTx[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  explorerUrl: string;
  chainId: number;
}) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton h-[4.5rem] rounded-[var(--radius-lg)]"
          />
        ))}
      </div>
    );
  }
  if (error) return <FetchError what="activity" onRetry={onRetry} />;

  // Overlay locally-tracked pending sends that the indexer hasn't picked up yet.
  const indexedHashes = new Set(
    (history ?? []).map((h) => h.hash.toLowerCase()),
  );
  const localPending = pending.filter(
    (t) =>
      t.chainId === chainId &&
      t.status === "pending" &&
      !indexedHashes.has(t.hash.toLowerCase()),
  );

  if (localPending.length === 0 && (!history || history.length === 0)) {
    return (
      <Empty
        icon="activity"
        text="No activity yet"
        sub="Sends and receipts will appear here"
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {localPending.map((tx) => (
        <Row
          key={tx.hash}
          href={`${explorerUrl}/tx/${tx.hash}`}
          dir="out"
          title={tx.label}
          sub={`${timeAgo(tx.timestamp)} · ${shortAddress(tx.to)}`}
          right={<StatusPill status="pending" />}
        />
      ))}
      {(history ?? []).map((h) => (
        <Row
          key={h.id}
          href={`${explorerUrl}/tx/${h.hash}`}
          dir={h.direction}
          title={
            h.direction === "in"
              ? `Received${h.amount ? ` ${h.amount}` : ""} ${h.asset}`.trim()
              : `Sent${h.amount ? ` ${h.amount}` : ""} ${h.asset}`.trim()
          }
          sub={`${h.timestamp ? timeAgo(h.timestamp) : ""}${h.counterparty ? ` · ${shortAddress(h.counterparty)}` : ""}`}
        />
      ))}
    </div>
  );

  function Row({
    href,
    dir,
    title,
    sub,
    right,
  }: {
    href: string;
    dir: HistoryItem["direction"];
    title: string;
    sub: string;
    right?: React.ReactNode;
  }) {
    const incoming = dir === "in";
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between py-3.5 px-4 card press"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: incoming
                ? "var(--c-success-subtle)"
                : "var(--c-accent-soft)",
              color: incoming ? "var(--c-success)" : "var(--c-accent)",
            }}
          >
            <Icon
              name={incoming ? "arrow-down" : "arrow-up"}
              size={17}
              strokeWidth={1.8}
            />
          </span>
          <div className="min-w-0">
            <div className="text-[0.875rem] font-semibold text-text truncate">
              {title}
            </div>
            <div className="text-xs text-text-tertiary mt-0.5 truncate">
              {sub}
            </div>
          </div>
        </div>
        {right}
      </a>
    );
  }
}

function StatusPill({ status }: { status: ActivityTx["status"] }) {
  const map = {
    pending: { label: "Pending", cls: "bg-warning-subtle text-warning" },
    confirmed: { label: "Done", cls: "bg-success-subtle text-success" },
    failed: { label: "Failed", cls: "bg-danger-subtle text-danger" },
  }[status];
  return (
    <span
      className={`text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2 ${map.cls}`}
    >
      {map.label}
    </span>
  );
}

function Empty({
  icon,
  text,
  sub,
}: {
  icon: "wallet" | "sparkle" | "activity";
  text: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center pt-4 pb-14 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--c-accent-soft)", color: "var(--c-accent)" }}
      >
        <Icon name={icon} size={24} strokeWidth={1.6} />
      </div>
      <p className="text-[0.9375rem] font-semibold text-text">{text}</p>
      <p className="text-xs text-text-tertiary mt-1.5 max-w-[16rem] leading-relaxed">
        {sub}
      </p>
    </div>
  );
}

function FetchError({ what, onRetry }: { what: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: "var(--c-danger-subtle)",
          color: "var(--c-danger)",
        }}
      >
        <Icon name="alert" size={24} strokeWidth={1.6} />
      </div>
      <p className="text-[0.9375rem] font-semibold text-text">
        Couldn&apos;t load {what}
      </p>
      <p className="text-xs text-text-tertiary mt-1.5 max-w-[16rem] leading-relaxed">
        The network request failed. Check your connection and try again.
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-4"
        >
          Retry
        </Button>
      )}
    </div>
  );
}

// ---- Toast ----

function TxToast({
  status,
  hash,
  error,
  onDismiss,
  explorerUrl,
}: {
  status: TxStatus;
  hash: `0x${string}` | null;
  error: string | null;
  onDismiss: () => void;
  explorerUrl: string;
}) {
  const confirmed = status === "confirmed";
  const failed = status === "failed";
  return (
    <div
      className="px-4 py-3.5 rounded-[var(--radius-lg)] flex items-center gap-3.5 cursor-pointer card"
      style={{ boxShadow: "var(--shadow-lg)" }}
      onClick={onDismiss}
      role="status"
    >
      <span
        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
        style={{
          background: confirmed
            ? "var(--c-success-subtle)"
            : failed
              ? "var(--c-danger-subtle)"
              : "var(--c-accent-soft)",
          color: confirmed
            ? "var(--c-success)"
            : failed
              ? "var(--c-danger)"
              : "var(--c-accent)",
        }}
      >
        {confirmed ? (
          <Icon name="check" size={17} strokeWidth={2.2} />
        ) : failed ? (
          <Icon name="close" size={17} />
        ) : (
          <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin block" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[0.875rem] font-semibold text-text">
          {confirmed
            ? "Transaction sent"
            : failed
              ? "Transaction failed"
              : "Broadcasting…"}
        </div>
        {hash && (
          <a
            href={`${explorerUrl}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent"
            onClick={(e) => e.stopPropagation()}
          >
            View on explorer ↗
          </a>
        )}
        {error && (
          <div className="text-xs text-danger truncate mt-0.5">{error}</div>
        )}
      </div>
      <Icon name="close" size={14} className="text-text-tertiary shrink-0" />
    </div>
  );
}
