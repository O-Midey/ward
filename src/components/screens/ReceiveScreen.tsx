'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useWalletStore } from '@/store/wallet';
import { IconButton, Icon } from '@/components/ui';
import { copyEphemeral } from '@/lib/clipboard';

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function ReceiveScreen({ onBack }: { onBack: () => void }) {
  const { accounts, activeAccountIndex, activeChain } = useWalletStore();
  const account = accounts[activeAccountIndex];
  const [copied, setCopied] = useState(false);

  if (!account) return null;

  const handleCopy = async () => {
    await copyEphemeral(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <h2 className="font-display text-xl text-text">Receive</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-7 pb-12 gap-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.5, ease: EASE }}
        >
          {/* QR card */}
          <div
            className="p-5 rounded-[var(--radius-xl)] mb-7 relative"
            style={{ background: '#fff', boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Corner accents */}
            {[
              'top-0 left-0 border-t-2 border-l-2 rounded-tl-[var(--radius-md)]',
              'top-0 right-0 border-t-2 border-r-2 rounded-tr-[var(--radius-md)]',
              'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[var(--radius-md)]',
              'bottom-0 right-0 border-b-2 border-r-2 rounded-br-[var(--radius-md)]',
            ].map((cls, i) => (
              <span
                key={i}
                className={`absolute w-5 h-5 ${cls}`}
                style={{ borderColor: 'var(--c-accent)', margin: '8px' }}
              />
            ))}
            <QRCodeSVG value={account.address} size={192} level="M" fgColor="#0f1220" bgColor="#ffffff" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5, ease: EASE }}
          className="w-full max-w-sm text-center"
        >
          <p className="text-[0.9375rem] font-semibold text-text mb-1">{account.name}</p>
          <p className="text-xs text-text-tertiary mb-4">{activeChain.name}</p>

          <button
            onClick={handleCopy}
            className="w-full font-mono text-xs text-text-secondary bg-surface px-4 py-3.5 rounded-[var(--radius-lg)] break-all press inline-flex items-center justify-center gap-2.5"
            style={{ boxShadow: 'var(--shadow-card)' }}
            aria-label="Copy address"
          >
            <Icon
              name={copied ? 'check' : 'copy'}
              size={15}
              className={copied ? 'text-success shrink-0' : 'text-text-tertiary shrink-0'}
            />
            <span className="break-all text-left leading-relaxed">{account.address}</span>
          </button>

          <p className="text-xs mt-3 font-medium" style={{ color: copied ? 'var(--c-success)' : 'var(--c-text-tertiary)' }}>
            {copied ? '✓ Copied — clears in 30s' : 'Tap to copy address'}
          </p>
        </motion.div>

        <p className="text-[0.7rem] text-text-tertiary mt-8 text-center max-w-xs leading-relaxed">
          {activeChain.nativeToken} and tokens on {activeChain.name} only. Sepolia testnet — no real value.
        </p>
      </div>
    </motion.div>
  );
}
