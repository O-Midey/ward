'use client';

// ============================================================
// Ward — Transaction Confirmation Sheet
// ============================================================
// Decodes and displays everything about a transaction before
// signing: type, recipient, amount, and a full gas-fee breakdown.
// Flags ERC-20 approvals (especially unlimited) and unknown
// contract calls. The flagship security surface.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '@/store/wallet';
import { getBalance, applyGasSpeed, type GasSpeed } from '@/layers/chain';
import { Sheet, Button, Icon } from '@/components/ui';
import { formatAmount, shortAddress } from '@/lib/format';
import type { PreparedTx, TxStatus } from '@/hooks/useSendTransaction';

interface ConfirmSheetProps {
  prepared: PreparedTx;
  onConfirm: (speed: GasSpeed) => void;
  onReject: () => void;
  status: TxStatus;
}

const SPEEDS: { id: GasSpeed; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];

const TYPE_LABEL: Record<string, string> = {
  eth_transfer: 'Transfer',
  erc20_approve: 'Token Approval',
  erc20_transfer: 'Token Transfer',
  contract_call: 'Contract Call',
  unknown: 'Unknown',
};

export function ConfirmSheet({ prepared, onConfirm, onReject, status }: ConfirmSheetProps) {
  const { activeChain, getActiveAccount } = useWalletStore();
  const account = getActiveAccount();
  const { request: tx, decoded, gas } = prepared;

  const { data: balance } = useQuery({
    queryKey: ['balance', account?.address, activeChain.id],
    queryFn: () => getBalance(account!.address, activeChain),
    enabled: !!account,
  });

  const [speed, setSpeed] = useState<GasSpeed>('normal');

  const isApproval = decoded.type === 'erc20_approve';
  const isUnlimited = isApproval && !!decoded.params?.isUnlimited;
  const isBusy = status === 'signing' || status === 'broadcasting';

  const value = BigInt(tx.value);
  const fee = applyGasSpeed(gas.maxFeePerGas, speed) * gas.gasLimit;
  const total = value + fee;
  const insufficient = balance ? total > balance.wei : false;

  return (
    <Sheet
      open
      onClose={onReject}
      dismissible={!isBusy}
      title="Confirm transaction"
      subtitle="Review everything before signing"
    >
      <div className="px-6 pb-8 pt-2">
        {/* ---- Warnings ---- */}
        {isUnlimited && (
          <Warning
            icon="alert"
            tone="warning"
            title="Unlimited approval requested"
            body="This contract is asking to spend an unlimited amount of your tokens. Common in DeFi, but it could drain this token's balance at any time in the future."
          />
        )}
        {isApproval && !isUnlimited && (
          <Warning
            icon="info"
            tone="warning"
            title="Token approval"
            body="You're allowing this contract to spend your tokens. Only approve contracts you trust."
          />
        )}
        {decoded.type === 'unknown' && tx.data && tx.data !== '0x' && (
          <Warning
            icon="search"
            tone="neutral"
            title="Unrecognized contract call"
            body="This transaction calls a function we couldn't decode. Make sure you trust this contract before signing."
          />
        )}

        {/* ---- Details ---- */}
        <div className="card divide-y divide-[var(--c-border)] mt-1">
          <Row label="Network" value={activeChain.name} />
          <Row
            label="Type"
            value={
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  decoded.type === 'erc20_approve'
                    ? 'bg-warning-subtle text-warning'
                    : decoded.type === 'erc20_transfer'
                    ? 'bg-success-subtle text-success'
                    : decoded.type === 'eth_transfer'
                    ? 'bg-accent-soft text-accent'
                    : 'bg-surface text-text-secondary'
                }`}
              >
                {TYPE_LABEL[decoded.type]}
              </span>
            }
          />
          {decoded.functionName && <Row label="Function" value={decoded.functionName} mono />}
          {decoded.type === 'erc20_transfer' && decoded.params?.to ? (
            <>
              <Row label="Recipient" value={shortAddress(String(decoded.params.to), 10, 8)} mono />
              <Row label="Token" value={shortAddress(tx.to, 10, 8)} mono />
            </>
          ) : (
            <Row label="To" value={shortAddress(tx.to, 10, 8)} mono />
          )}
          {isApproval && decoded.spender && <Row label="Spender" value={shortAddress(decoded.spender, 10, 8)} mono />}
          {decoded.type === 'erc20_transfer' && decoded.params?.amount && (
            <Row label="Token amount" value={String(decoded.params.amount)} />
          )}
          {value > 0n && (
            <Row label="Amount" value={`${formatEther(value)} ${activeChain.nativeToken}`} emphasis />
          )}
          {isApproval && decoded.allowance && (
            <Row
              label="Allowance"
              value={decoded.params?.isUnlimited ? 'Unlimited' : String(decoded.params?.amount ?? decoded.allowance)}
            />
          )}
        </div>

        {/* ---- Fee breakdown ---- */}
        <div className="card mt-3 p-4 space-y-3">
          <div className="flex items-center gap-2 text-text-tertiary">
            <Icon name="gas" size={15} />
            <span className="text-xs uppercase tracking-wider">Network fee</span>
          </div>

          {/* Speed selector */}
          <div className="grid grid-cols-3 gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSpeed(s.id)}
                disabled={isBusy}
                className={`py-2 rounded-[var(--radius-md)] text-xs font-semibold transition-colors press ${
                  speed === s.id ? 'bg-accent text-[var(--c-on-accent)]' : 'bg-surface-2 text-text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <FeeRow label="Estimated fee" value={`${formatAmount(formatEther(fee))} ${activeChain.nativeToken}`} />
          <FeeRow
            label="Max total"
            value={`${formatAmount(formatEther(total))} ${activeChain.nativeToken}`}
            strong
          />
        </div>

        {insufficient && (
          <p className="text-sm text-danger mt-3 flex items-center gap-2">
            <Icon name="alert" size={16} />
            Not enough {activeChain.nativeToken} to cover amount + fee.
          </p>
        )}

        {/* ---- Actions ---- */}
        <div className="flex gap-3 mt-7">
          <Button variant="secondary" fullWidth disabled={isBusy} onClick={onReject}>
            Cancel
          </Button>
          <Button
            fullWidth
            loading={isBusy}
            disabled={isBusy || insufficient}
            variant={isUnlimited ? 'danger' : 'primary'}
            onClick={() => onConfirm(speed)}
          >
            {isBusy ? 'Signing…' : isUnlimited ? 'Approve anyway' : 'Confirm & sign'}
          </Button>
        </div>

        <p className="text-xs text-text-tertiary text-center mt-4">Sepolia testnet — no real value</p>
      </div>
    </Sheet>
  );
}

// ---- Pieces ----

function Warning({
  icon,
  tone,
  title,
  body,
}: {
  icon: 'alert' | 'info' | 'search';
  tone: 'warning' | 'neutral';
  title: string;
  body: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[var(--radius-lg)] p-4 mb-4 border ${
        tone === 'warning' ? 'bg-warning-subtle border-[color-mix(in_srgb,var(--c-warning)_30%,transparent)]' : 'card'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={tone === 'warning' ? 'text-warning' : 'text-text-secondary'}>
          <Icon name={icon} size={20} />
        </span>
        <div>
          <p className={`text-sm font-medium mb-1 ${tone === 'warning' ? 'text-warning' : 'text-text'}`}>{title}</p>
          <p className="text-xs text-text-secondary leading-relaxed">{body}</p>
        </div>
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-text-tertiary shrink-0">{label}</span>
      <span
        className={`text-right ml-4 break-all ${mono ? 'font-mono text-xs text-text-secondary' : 'text-sm'} ${
          emphasis ? 'font-medium tabular-nums text-text' : 'text-text'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function FeeRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${strong ? 'text-text font-medium' : 'text-text-secondary'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${strong ? 'text-text font-semibold' : 'text-text-secondary'}`}>
        {value}
      </span>
    </div>
  );
}
