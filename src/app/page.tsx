'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWalletStore } from '@/store/wallet';
import { useAutoLock } from '@/hooks/useAutoLock';
import { useSendTransaction } from '@/hooks/useSendTransaction';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import { UnlockScreen } from '@/components/screens/UnlockScreen';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { SendScreen } from '@/components/screens/SendScreen';
import { ReceiveScreen } from '@/components/screens/ReceiveScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { ConfirmSheet } from '@/components/screens/ConfirmSheet';
import { SignTypedDataSheet } from '@/components/screens/SignTypedDataSheet';
import { OfflineBanner } from '@/components/OfflineBanner';
import type { GasSpeed } from '@/layers/chain';
import type { SendAsset } from '@/lib/types';

type AuthedScreen = 'home' | 'send' | 'receive' | 'settings';

export default function App() {
  const { isLocked, hasWallet, isChecking, checkExistingWallet } = useWalletStore();
  const [screen, setScreen] = useState<AuthedScreen>('home');
  const [signOpen, setSignOpen] = useState(false);
  const [sendAsset, setSendAsset] = useState<SendAsset>({ kind: 'native' });
  const tx = useSendTransaction();

  const goSend = (asset: SendAsset) => { tx.reset(); setSendAsset(asset); setScreen('send'); };

  useAutoLock();
  useEffect(() => { checkExistingWallet(); }, [checkExistingWallet]);

  const gate: 'loading' | 'unlock' | 'onboarding' | 'authed' = isChecking
    ? 'loading'
    : hasWallet && isLocked
    ? 'unlock'
    : !hasWallet
    ? 'onboarding'
    : 'authed';

  const handleSend = async (to: string, valueWei: string, data?: string) => {
    await tx.prepare(to, valueWei, data);
  };

  const handleConfirm = async (speed: GasSpeed) => {
    const hash = await tx.confirm(speed);
    if (hash) setScreen('home');
  };

  const reviewing = tx.prepared && (tx.status === 'review' || tx.status === 'signing' || tx.status === 'broadcasting');

  if (gate === 'loading') {
    return (
      <PhoneShell>
        <div className="flex-1 min-h-0 flex items-center justify-center bg-bg">
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div
              className="w-16 h-16 rounded-[var(--radius-xl)] flex items-center justify-center relative overflow-hidden hero-noise surface-shine"
              style={{ background: 'var(--grad-hero)', boxShadow: 'var(--shadow-accent)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
                <path d="M12 11v3" />
                <circle cx="12" cy="10.5" r="0.6" fill="white" stroke="none" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="font-display text-2xl text-text tracking-tight">Ward</h1>
              <p className="text-xs text-text-tertiary mt-1 tracking-widest uppercase font-semibold">Sepolia Testnet</p>
            </div>
          </motion.div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="flex-1 min-h-0 bg-bg overflow-hidden">
        <AnimatePresence mode="wait">
          {gate === 'onboarding' && (
            <div key="onboarding" className="flex-1 min-h-0"><OnboardingScreen /></div>
          )}
          {gate === 'unlock' && (
            <div key="unlock" className="flex-1 min-h-0"><UnlockScreen /></div>
          )}
          {gate === 'authed' && screen === 'home' && (
            <HomeScreen
              key="home"
              onSend={() => goSend({ kind: 'native' })}
              onSendAsset={goSend}
              onReceive={() => setScreen('receive')}
              onSettings={() => setScreen('settings')}
              txHash={tx.txHash}
              txStatus={tx.status}
              txError={tx.error}
              dismissTx={tx.reset}
            />
          )}
          {gate === 'authed' && screen === 'send' && (
            <SendScreen
              key="send"
              onBack={() => { tx.reset(); setScreen('home'); }}
              onSend={handleSend}
              estimating={tx.status === 'estimating'}
              initialAsset={sendAsset}
            />
          )}
          {gate === 'authed' && screen === 'receive' && (
            <ReceiveScreen key="receive" onBack={() => setScreen('home')} />
          )}
          {gate === 'authed' && screen === 'settings' && (
            <SettingsScreen key="settings" onBack={() => setScreen('home')} onSignDemo={() => setSignOpen(true)} />
          )}
        </AnimatePresence>

        {gate === 'authed' && reviewing && tx.prepared && (
          <ConfirmSheet
            prepared={tx.prepared}
            status={tx.status}
            onConfirm={handleConfirm}
            onReject={() => { tx.reset(); setScreen('send'); }}
          />
        )}

        <SignTypedDataSheet open={signOpen} onClose={() => setSignOpen(false)} />
      </div>
    </PhoneShell>
  );
}

// Renders a phone frame on desktop, full-bleed on mobile.
function PhoneShell({ children }: { children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const FRAME_H = 852;
    const FRAME_W = 393;
    const update = () => {
      if (window.innerWidth < 640 || !frameRef.current) return;
      // Scale by height first, then clamp by width so the phone never overflows horizontally
      const scaleH = (window.innerHeight - 40) / FRAME_H;
      const scaleW = (window.innerWidth - 32) / FRAME_W;
      const scale = Math.min(scaleH, scaleW, 1);
      frameRef.current.style.transform = `scale(${scale.toFixed(4)})`;
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="phone-desktop-wrap">
      <div className="phone-frame" ref={frameRef}>
        <div className="phone-screen">
          <div className="phone-island" />
          <OfflineBanner />
          {children}
        </div>
      </div>
    </div>
  );
}
