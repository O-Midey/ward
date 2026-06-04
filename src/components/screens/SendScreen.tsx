'use client';

// ============================================================
// Ward — Send Screen
// ============================================================
// Asset-aware send: native value, ERC-20 tokens, or an NFT.
// Recipient + amount entry with live balance and a Max helper.
// Token/NFT sends are encoded to calldata here; gas is estimated
// on review where the ConfirmSheet shows the full fee breakdown.

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { isAddress, parseEther, formatUnits } from 'viem';
import { useWalletStore } from '@/store/wallet';
import { getBalance } from '@/layers/chain';
import { getTokenBalances } from '@/layers/services';
import { Button, IconButton, Field, Icon } from '@/components/ui';
import { formatAmount, formatTokenBalance, shortAddress } from '@/lib/format';
import { encodeErc20Transfer, encodeErc721Transfer } from '@/lib/encode';
import { isEnsName, resolveEns } from '@/lib/ens';
import { addRecent, getRecents } from '@/lib/recents';
import type { SendAsset, TokenBalance } from '@/lib/types';

interface SendScreenProps {
  onBack: () => void;
  onSend: (to: string, valueWei: string, data?: string) => void;
  estimating?: boolean;
  initialAsset?: SendAsset;
}

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function SendScreen({ onBack, onSend, estimating, initialAsset }: SendScreenProps) {
  const { activeChain, accounts, activeAccountIndex } = useWalletStore();
  const account = accounts[activeAccountIndex];

  const [asset, setAsset] = useState<SendAsset>(initialAsset ?? { kind: 'native' });
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');

  // ENS resolution + recents.
  const [resolved, setResolved] = useState<`0x${string}` | null>(null);
  const [resolving, setResolving] = useState(false);
  const [ensFailed, setEnsFailed] = useState(false);
  const [recents] = useState<string[]>(() => getRecents());

  const isNFT = asset.kind === 'erc721';

  // Resolve the recipient: a hex address is used directly; an ENS name is
  // looked up on mainnet (debounced). This is a genuine external-sync effect
  // (it reacts to the `to` input and an async network lookup), so the
  // synchronous setState is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const input = to.trim();
    setEnsFailed(false);
    if (isAddress(input)) { setResolved(input); setResolving(false); return; }
    if (!isEnsName(input)) { setResolved(null); setResolving(false); return; }
    setResolving(true);
    setResolved(null);
    let cancelled = false;
    const id = setTimeout(async () => {
      const addr = await resolveEns(input);
      if (cancelled) return;
      setResolving(false);
      if (addr) setResolved(addr);
      else setEnsFailed(true);
    }, 400);
    return () => { cancelled = true; clearTimeout(id); };
  }, [to]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { data: balance } = useQuery({
    queryKey: ['balance', account?.address, activeChain.id],
    queryFn: () => getBalance(account!.address, activeChain),
    enabled: !!account,
  });

  const { data: tokens } = useQuery({
    queryKey: ['tokens', account?.address, activeChain.id],
    queryFn: () => getTokenBalances(account!.address, activeChain),
    enabled: !!account && !isNFT,
    staleTime: 30_000,
  });

  // Available balance + symbol for the selected fungible asset.
  const { available, symbol } = useMemo(() => {
    if (asset.kind === 'erc20') {
      return {
        available: Number(asset.token.balance) / 10 ** asset.token.decimals,
        symbol: asset.token.symbol,
      };
    }
    return { available: balance ? parseFloat(balance.formatted) : 0, symbol: activeChain.nativeToken };
  }, [asset, balance, activeChain.nativeToken]);

  const amountNum = parseFloat(amount);
  const overBalance = !isNFT && !!amount && amountNum > available;
  const validRecipient = !!resolved && isAddress(resolved);
  const isValid = validRecipient && !resolving && (isNFT || (!!amount && amountNum > 0 && !overBalance));

  const setMax = () => {
    if (asset.kind === 'erc20') setAmount(formatUnits(BigInt(asset.token.balance), asset.token.decimals));
    else if (balance) setAmount(balance.formatted);
    setError('');
  };

  const handleNext = () => {
    if (!account) return;
    if (!resolved) return setError('Enter a valid address or ENS name');
    const recipient = resolved;

    try {
      if (asset.kind === 'native') {
        if (isNaN(amountNum) || amountNum <= 0) return setError('Enter a valid amount');
        if (overBalance) return setError('Amount exceeds your balance');
        onSend(recipient, parseEther(amount).toString(), undefined);
      } else if (asset.kind === 'erc20') {
        if (isNaN(amountNum) || amountNum <= 0) return setError('Enter a valid amount');
        if (overBalance) return setError('Amount exceeds your balance');
        const data = encodeErc20Transfer(recipient, amount, asset.token.decimals);
        onSend(asset.token.contractAddress, '0', data);
      } else {
        const data = encodeErc721Transfer(account.address, recipient, asset.nft.tokenId);
        onSend(asset.nft.contractAddress, '0', data);
      }
      addRecent(recipient);
      setError('');
    } catch {
      setError('Could not build transaction — check the amount');
    }
  };

  if (!account) return null;

  const title = isNFT ? 'Send NFT' : `Send ${symbol}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="h-full flex flex-col"
      style={{ paddingTop: 'var(--ward-safe-top)' }}
    >
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <IconButton icon="arrow-left" label="Back" onClick={onBack} className="-ml-1 text-text" />
        <h2 className="font-display text-xl text-text">{title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 space-y-5">
        {/* Asset selector / NFT preview */}
        <div>
          <span className="text-[0.7rem] font-bold text-text-tertiary uppercase tracking-[0.1em] mb-2 block">Asset</span>
          {isNFT && asset.kind === 'erc721' ? (
            <div className="flex items-center gap-3 bg-surface px-4 py-3 rounded-[var(--radius-lg)]" style={{ boxShadow: 'var(--shadow-card)' }}>
              {asset.nft.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.nft.image} alt="" className="w-10 h-10 rounded-[var(--radius-md)] object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-surface-2 flex items-center justify-center"><Icon name="sparkle" size={18} /></div>
              )}
              <div className="min-w-0">
                <div className="text-[0.9375rem] font-semibold text-text truncate">{asset.nft.name || `#${asset.nft.tokenId.slice(0, 8)}`}</div>
                {asset.nft.collection && <div className="text-xs text-text-tertiary truncate">{asset.nft.collection}</div>}
              </div>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowPicker((v) => !v)}
                aria-expanded={showPicker}
                className="w-full flex items-center justify-between bg-surface px-4 py-3.5 rounded-[var(--radius-lg)] press"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <span className="text-[0.9375rem] font-semibold text-text">{symbol}</span>
                <span className="flex items-center gap-2 text-xs text-text-tertiary">
                  {formatAmount(available)} available
                  <Icon name="chevron-down" size={14} />
                </span>
              </button>
              <AnimatePresence>
                {showPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute z-10 mt-1 w-full card overflow-hidden max-h-64 overflow-y-auto"
                  >
                    <AssetRow
                      label={activeChain.nativeToken}
                      sub="Native token"
                      right={balance ? formatAmount(balance.formatted) : '0'}
                      active={asset.kind === 'native'}
                      onClick={() => { setAsset({ kind: 'native' }); setShowPicker(false); setAmount(''); }}
                    />
                    {tokens?.map((t: TokenBalance) => (
                      <AssetRow
                        key={t.contractAddress}
                        label={t.symbol}
                        sub={t.name}
                        right={formatTokenBalance(t.balance, t.decimals)}
                        active={asset.kind === 'erc20' && asset.token.contractAddress === t.contractAddress}
                        onClick={() => { setAsset({ kind: 'erc20', token: t }); setShowPicker(false); setAmount(''); }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Recipient */}
        <div>
          <Field
            label="Recipient"
            mono
            placeholder="0x… or name.eth"
            value={to}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => { setTo(e.target.value); setError(''); }}
          />
          {/* ENS resolution feedback */}
          {resolving && <p className="text-xs text-text-tertiary mt-2 flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />Resolving…</p>}
          {!resolving && resolved && isEnsName(to) && (
            <p className="text-xs text-success mt-2 font-mono flex items-center gap-1.5"><Icon name="check" size={13} />{shortAddress(resolved, 10, 8)}</p>
          )}
          {!resolving && ensFailed && <p className="text-xs text-danger mt-2">Couldn&apos;t resolve that name</p>}

          {/* Recent recipients */}
          {!to && recents.length > 0 && (
            <div className="mt-3">
              <p className="text-[0.7rem] font-bold text-text-tertiary uppercase tracking-[0.1em] mb-2">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recents.map((addr) => (
                  <button
                    key={addr}
                    onClick={() => { setTo(addr); setError(''); }}
                    className="text-xs font-mono text-text-secondary bg-surface px-3 py-1.5 rounded-full press"
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    {shortAddress(addr)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Amount (not for NFTs) */}
        {!isNFT && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.7rem] font-bold text-text-tertiary uppercase tracking-[0.1em]">Amount</span>
              <button onClick={setMax} className="text-xs font-semibold text-accent press">
                {formatAmount(available)} {symbol} · Max
              </button>
            </div>
            <Field
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              adornment={symbol}
              className="text-lg tabular-nums font-medium"
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              error={overBalance ? 'Exceeds balance' : undefined}
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),2rem)]">
        <Button fullWidth loading={estimating} disabled={!isValid} onClick={handleNext}>
          {estimating ? 'Estimating fee…' : 'Review transaction'}
        </Button>
        <p className="text-xs text-text-tertiary text-center mt-3">You’ll review the full fee before signing.</p>
      </div>
    </motion.div>
  );
}

function AssetRow({ label, sub, right, active, onClick }: {
  label: string;
  sub: string;
  right: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-accent-soft transition-colors border-b border-[var(--c-border)] last:border-0"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text truncate">{label}</div>
        <div className="text-xs text-text-tertiary truncate">{sub}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm tabular-nums text-text-secondary">{right}</span>
        {active && <Icon name="check" size={15} className="text-accent" />}
      </div>
    </button>
  );
}
