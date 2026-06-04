'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/store/wallet';
import { SUPPORTED_CHAINS } from '@/lib/types';
import { getMnemonicWords } from '@/layers/key';
import { Button, IconButton, Card, Icon, PasswordField, type IconName } from '@/components/ui';
import { copyEphemeral } from '@/lib/clipboard';
import { usePwaStore } from '@/store/pwa';

const EASE = [0.22, 0.61, 0.36, 1] as const;

const LOCK_OPTIONS = [
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 5 * 60_000 },
  { label: '15 min', ms: 15 * 60_000 },
  { label: '30 min', ms: 30 * 60_000 },
];

interface SettingsScreenProps {
  onBack: () => void;
  onSignDemo: () => void;
}

export function SettingsScreen({ onBack, onSignDemo }: SettingsScreenProps) {
  const { lock, resetWallet, verifyPassword, mnemonic, activeChain, switchChain, autoLockMs, setAutoLockMs } = useWalletStore();
  const { installEvent, setInstallEvent } = usePwaStore();

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showNetworks, setShowNetworks] = useState(false);

  // Re-auth gates for sensitive actions.
  const [seedReauth, setSeedReauth] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [resetPw, setResetPw] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const copySeed = async () => {
    if (!mnemonic) return;
    await copyEphemeral(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const revealSeed = async () => {
    setPwBusy(true);
    setPwError('');
    const ok = await verifyPassword(pw);
    setPwBusy(false);
    if (ok) { setShowSeed(true); setSeedReauth(false); setPw(''); }
    else setPwError('Incorrect password');
  };

  const hideSeed = () => { setShowSeed(false); setSeedReauth(false); setPw(''); setPwError(''); };

  const doReset = async () => {
    setResetBusy(true);
    setResetError('');
    const ok = await verifyPassword(resetPw);
    if (!ok) { setResetBusy(false); setResetError('Incorrect password'); return; }
    await resetWallet();
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
        <h2 className="font-display text-xl text-text">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-12 space-y-7">

        {/* Install (only when the browser offers it) */}
        {installEvent && (
          <Section title="App">
            <button onClick={handleInstall} className="w-full text-left press">
              <SettingRow
                icon="arrow-down"
                iconBg="bg-accent-soft text-accent"
                label="Install Ward"
                sub="Add to your home screen for an app-like experience"
                right={<Icon name="chevron-right" size={16} className="text-text-tertiary" />}
              />
            </button>
          </Section>
        )}

        {/* Network */}
        <Section title="Network">
          <button onClick={() => setShowNetworks((v) => !v)} className="w-full text-left" aria-expanded={showNetworks}>
            <SettingRow
              icon="layers"
              iconBg="bg-[hsl(270_70%_55%/0.12)] text-[hsl(270_70%_60%)]"
              label={activeChain.name}
              sub="Active network"
              right={<Icon name="chevron-right" size={16} className="text-text-tertiary" />}
            />
          </button>
          {showNetworks && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-1 card overflow-hidden"
            >
              {SUPPORTED_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => { switchChain(chain.id); setShowNetworks(false); }}
                  className="w-full px-4 py-3 text-left hover:bg-accent-soft transition-colors border-b border-[var(--c-border)] last:border-0 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-text">{chain.name}</div>
                    <div className="text-xs text-text-tertiary mt-0.5">{chain.nativeToken}</div>
                  </div>
                  {chain.id === activeChain.id && <Icon name="check" size={15} className="text-accent" />}
                </button>
              ))}
            </motion.div>
          )}
        </Section>

        {/* Auto-lock */}
        <Section title="Auto-lock">
          <Card className="p-3">
            <div className="grid grid-cols-4 gap-1.5">
              {LOCK_OPTIONS.map((opt) => (
                <button
                  key={opt.ms}
                  onClick={() => setAutoLockMs(opt.ms)}
                  className={`py-2 rounded-[var(--radius-md)] text-sm font-semibold transition-colors press ${
                    autoLockMs === opt.ms
                      ? 'bg-accent text-[var(--c-on-accent)]'
                      : 'text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>
          <p className="text-xs text-text-tertiary mt-2 px-1">Also locks ~30s after the tab is hidden.</p>
        </Section>

        {/* Security */}
        <Section title="Security">
          <div className="card overflow-hidden divide-y divide-[var(--c-border)]">
            {!showSeed && !seedReauth ? (
              <button onClick={() => { setSeedReauth(true); setPw(''); setPwError(''); }} className="w-full text-left">
                <SettingRow
                  icon="lock"
                  iconBg="bg-[hsl(35_90%_55%/0.12)] text-[hsl(35_90%_55%)]"
                  label="Recovery phrase"
                  sub="Confirm your password to reveal"
                  right={<Icon name="chevron-right" size={16} className="text-text-tertiary" />}
                  noBorder
                />
              </button>
            ) : seedReauth ? (
              <div className="p-4">
                <p className="text-xs text-text-secondary mb-3 font-medium">Enter your password to reveal your recovery phrase.</p>
                <PasswordField
                  placeholder="Password"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setPwError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && pw && revealSeed()}
                  error={pwError || undefined}
                  autoFocus
                />
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" fullWidth size="md" onClick={hideSeed}>Cancel</Button>
                  <Button fullWidth size="md" loading={pwBusy} disabled={!pw} onClick={revealSeed}>Reveal</Button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs text-warning mb-3 flex items-center gap-1.5 font-medium">
                  <Icon name="alert" size={14} /> Never share these words with anyone.
                </p>
                {mnemonic && (
                  <div className="grid grid-cols-3 gap-x-3 gap-y-2 bg-bg rounded-[var(--radius-md)] p-3">
                    {getMnemonicWords(mnemonic).map((word, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[0.6875rem] text-text-tertiary tabular-nums w-4">{i + 1}</span>
                        <span className="text-xs text-text font-semibold">{word}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <button onClick={copySeed} className="text-xs text-accent press inline-flex items-center gap-1.5 font-medium">
                    <Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={hideSeed} className="text-xs text-text-tertiary press">Hide</button>
                </div>
              </div>
            )}

            <button onClick={onSignDemo} className="w-full text-left">
              <SettingRow
                icon="search"
                iconBg="bg-[hsl(200_80%_55%/0.12)] text-[hsl(200_80%_55%)]"
                label="Sign a sample message"
                sub="Preview the EIP-712 signing flow"
                right={<Icon name="chevron-right" size={16} className="text-text-tertiary" />}
                noBorder
              />
            </button>

            <button onClick={lock} className="w-full text-left">
              <SettingRow
                icon="lock"
                iconBg="bg-surface-2 text-text-tertiary"
                label="Lock wallet"
                sub="Wipe keys from memory now"
                right={<Icon name="chevron-right" size={16} className="text-text-tertiary" />}
                noBorder
              />
            </button>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full press"
            >
              <SettingRow
                icon="alert"
                iconBg="bg-danger-subtle text-danger"
                label="Reset wallet"
                sub="Delete all wallet data from this device"
                right={<Icon name="chevron-right" size={16} className="text-danger/60" />}
              />
            </button>
          ) : (
            <Card className="p-4 border border-danger/30" style={{ background: 'var(--c-danger-subtle)' }}>
              <p className="text-sm text-danger font-medium mb-1">Are you sure?</p>
              <p className="text-xs text-danger/80 mb-3 leading-relaxed">
                This deletes all wallet data from this device. Make sure you have your recovery phrase. Confirm your password to proceed.
              </p>
              <PasswordField
                placeholder="Password"
                value={resetPw}
                onChange={(e) => { setResetPw(e.target.value); setResetError(''); }}
                error={resetError || undefined}
              />
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" fullWidth size="md" onClick={() => { setConfirmReset(false); setResetPw(''); setResetError(''); }}>Cancel</Button>
                <Button variant="danger" fullWidth size="md" loading={resetBusy} disabled={!resetPw} onClick={doReset}>Yes, reset</Button>
              </div>
            </Card>
          )}
        </Section>

        <p className="text-[0.7rem] text-text-tertiary text-center leading-relaxed px-4">
          While unlocked, your seed lives only in this tab&apos;s memory and is wiped on lock.{' '}
          Only encrypted ciphertext is ever written to disk.
        </p>
      </div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[0.7rem] font-bold text-text-tertiary uppercase tracking-[0.1em] mb-3 px-1">{title}</h3>
      {children}
    </div>
  );
}

function SettingRow({
  icon,
  iconBg,
  label,
  sub,
  right,
  noBorder,
}: {
  icon: IconName;
  iconBg: string;
  label: string;
  sub: string;
  right?: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3.5 px-4 py-3.5 ${noBorder ? '' : 'card'}`}>
      <span className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon name={icon} size={17} strokeWidth={1.8} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[0.875rem] font-semibold text-text">{label}</div>
        <div className="text-xs text-text-tertiary mt-0.5">{sub}</div>
      </div>
      {right}
    </div>
  );
}
