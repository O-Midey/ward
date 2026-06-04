'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/store/wallet';
import { getMnemonicWords, validateMnemonic } from '@/layers/key';
import { Button, Field, PasswordField, TextArea, Icon } from '@/components/ui';
import { IntroScreen } from './IntroScreen';
import { copyEphemeral } from '@/lib/clipboard';

type Step = 'intro' | 'create-password' | 'backup-reveal' | 'backup-verify' | 'import' | 'import-password';

const EASE = [0.22, 0.61, 0.36, 1] as const;

// Step config for the progress indicator
const CREATE_STEPS = ['create-password', 'backup-reveal', 'backup-verify'] as const;
const IMPORT_STEPS = ['import', 'import-password'] as const;

function StepDots({ steps, current }: { steps: readonly string[]; current: string }) {
  const idx = steps.indexOf(current as never);
  if (idx < 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((_, i) => (
        <div
          key={i}
          className="transition-all duration-300"
          style={{
            height: '3px',
            borderRadius: '9999px',
            width: i <= idx ? '20px' : '6px',
            background: i <= idx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </div>
  );
}

// Every post-intro step uses a full-gradient layout with a frosted form card
function Step({
  k, onBack, backTo, title, sub, children, steps, currentStep, gradient,
}: {
  k: string;
  onBack: () => void;
  backTo?: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
  steps?: readonly string[];
  currentStep?: string;
  gradient?: string;
}) {
  return (
    <motion.div
      key={k}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: gradient ?? 'var(--grad-hero)', paddingTop: 'var(--ward-safe-top)' }}
    >
      {/* Top nav */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 pt-5 pb-0">
        <button
          onClick={onBack}
          className="press flex items-center gap-1.5 text-white/60 text-sm font-medium"
        >
          <Icon name="arrow-left" size={16} className="text-white/60" />
          {backTo ?? 'Back'}
        </button>
        {steps && currentStep && <StepDots steps={steps} current={currentStep} />}
      </div>

      {/* Title area */}
      <div className="flex-shrink-0 px-7 pt-8 pb-6">
        <h2 className="font-display text-[2rem] leading-[1.1] text-white mb-1.5">{title}</h2>
        {sub && <p className="text-[0.875rem] text-white/55 leading-relaxed">{sub}</p>}
      </div>

      {/* Frosted content card */}
      <div
        className="flex-1 flex flex-col overflow-y-auto mx-4 mb-4 rounded-[var(--radius-xl)] px-5 pt-6 pb-5"
        style={{
          background: 'var(--c-bg)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export function OnboardingScreen() {
  const { createWallet, importWallet } = useWalletStore();

  const [step, setStep] = useState<Step>('intro');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [importPhrase, setImportPhrase] = useState('');
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true); setError('');
    try {
      const result = await createWallet(password);
      setMnemonic(result.mnemonic);
      const words = getMnemonicWords(result.mnemonic);
      const unique = new Set<number>();
      while (unique.size < 3) unique.add(Math.floor(Math.random() * words.length));
      setVerifyIndices([...unique].sort((a, b) => a - b));
      setStep('backup-reveal');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  };

  const handleVerify = () => {
    const words = getMnemonicWords(mnemonic);
    for (const idx of verifyIndices) {
      if ((verifyInputs[idx] || '').trim().toLowerCase() !== words[idx])
        return setError(`Word #${idx + 1} doesn't match.`);
    }
    setError('');
  };

  const handleImport = () => {
    if (!validateMnemonic(importPhrase.trim().toLowerCase()))
      return setError('Invalid recovery phrase. Check each word and try again.');
    setError(''); setStep('import-password');
  };

  const handleImportWithPassword = async () => {
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true); setError('');
    try { await importWallet(importPhrase.trim(), password); }
    catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); }
    setLoading(false);
  };

  const copySeed = async () => {
    await copyEphemeral(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'intro') {
    return (
      <IntroScreen
        onCreate={() => { setPassword(''); setConfirm(''); setError(''); setStep('create-password'); }}
        onImport={() => { setError(''); setStep('import'); }}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <AnimatePresence mode="wait">

        {step === 'create-password' && (
          <Step key="create-password" k="create-password"
            onBack={() => setStep('intro')} backTo="Intro"
            title="Set a password" sub="Encrypts your keys on this device. Can't be recovered if forgotten."
            steps={CREATE_STEPS} currentStep={step}
          >
            <div className="space-y-4 flex-shrink-0">
              <PasswordField label="Password" placeholder="At least 8 characters" value={password} showStrength
                onChange={(e) => { setPassword(e.target.value); setError(''); }} autoFocus />
              <PasswordField label="Confirm password" placeholder="Re-enter password" value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }} error={error || undefined} />
            </div>
            <div className="flex-1 min-h-[24px]" />
            <Button fullWidth loading={loading} disabled={password.length < 8 || !confirm} onClick={handleCreate}>
              Create wallet
            </Button>
          </Step>
        )}

        {step === 'backup-reveal' && (
          <Step key="backup-reveal" k="backup-reveal"
            onBack={() => setStep('create-password')} backTo="Password"
            title="Recovery phrase" sub="Write these 12 words down in order. They're the only way to recover your wallet."
            steps={CREATE_STEPS} currentStep={step}
            gradient="linear-gradient(160deg, #1e40af 0%, #1e3a6e 50%, #0f2050 100%)"
          >
            <SeedGrid mnemonic={mnemonic} />
            <button onClick={copySeed} className="mt-4 flex-shrink-0 self-start inline-flex items-center gap-2 text-sm text-accent press font-medium">
              <Icon name={copied ? 'check' : 'copy'} size={15} />
              {copied ? 'Copied — clears in 30s' : 'Copy to clipboard'}
            </button>
            <div className="flex-1 min-h-[16px]" />
            <Button fullWidth onClick={() => { setVerifyInputs({}); setError(''); setStep('backup-verify'); }}>
              I&apos;ve written them down
            </Button>
          </Step>
        )}

        {step === 'backup-verify' && (
          <Step key="backup-verify" k="backup-verify"
            onBack={() => setStep('backup-reveal')} backTo="Phrase"
            title="Verify phrase" sub="Enter the requested words to confirm you've saved them."
            steps={CREATE_STEPS} currentStep={step}
          >
            <div className="space-y-4 flex-shrink-0">
              {verifyIndices.map((idx, n) => (
                <Field key={idx} label={`Word #${idx + 1}`} mono autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  placeholder={`Enter word ${idx + 1}`} value={verifyInputs[idx] || ''} autoFocus={n === 0}
                  onChange={(e) => { setVerifyInputs((p) => ({ ...p, [idx]: e.target.value })); setError(''); }}
                  error={n === verifyIndices.length - 1 ? error || undefined : undefined} />
              ))}
            </div>
            <div className="flex-1 min-h-[24px]" />
            <Button fullWidth disabled={verifyIndices.some((i) => !verifyInputs[i]?.trim())} onClick={handleVerify}>
              Confirm &amp; finish
            </Button>
          </Step>
        )}

        {step === 'import' && (
          <Step key="import" k="import"
            onBack={() => setStep('intro')} backTo="Intro"
            title="Import wallet" sub="Enter your 12-word BIP-39 recovery phrase, separated by spaces."
            steps={IMPORT_STEPS} currentStep={step}
          >
            <TextArea rows={5} autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="word1 word2 word3 … word12" value={importPhrase}
              onChange={(e) => { setImportPhrase(e.target.value); setError(''); }}
              error={error || undefined} autoFocus />
            <div className="flex-1 min-h-[24px]" />
            <Button fullWidth disabled={importPhrase.trim().split(/\s+/).filter(Boolean).length < 12} onClick={handleImport}>
              Continue
            </Button>
          </Step>
        )}

        {step === 'import-password' && (
          <Step key="import-password" k="import-password"
            onBack={() => setStep('import')} backTo="Phrase"
            title="Set a password" sub="Encrypts your imported keys on this device."
            steps={IMPORT_STEPS} currentStep={step}
          >
            <div className="space-y-4 flex-shrink-0">
              <PasswordField label="Password" placeholder="At least 8 characters" value={password} showStrength
                onChange={(e) => { setPassword(e.target.value); setError(''); }} autoFocus />
              <PasswordField label="Confirm password" placeholder="Re-enter password" value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }} error={error || undefined} />
            </div>
            <div className="flex-1 min-h-[24px]" />
            <Button fullWidth loading={loading} disabled={password.length < 8 || !confirm} onClick={handleImportWithPassword}>
              Import wallet
            </Button>
          </Step>
        )}

      </AnimatePresence>
    </div>
  );
}

function SeedGrid({ mnemonic }: { mnemonic: string }) {
  const words = getMnemonicWords(mnemonic);
  return (
    <div className="grid grid-cols-3 gap-2">
      {words.map((word, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2.5"
          style={{ background: 'var(--c-surface-2)', boxShadow: 'var(--shadow-card)' }}
        >
          <span className="text-[0.6rem] font-bold tabular-nums w-3 shrink-0 text-right text-text-tertiary leading-none">
            {i + 1}
          </span>
          <span className="text-[0.8125rem] font-semibold text-text leading-none font-mono truncate">
            {word}
          </span>
        </div>
      ))}
    </div>
  );
}
