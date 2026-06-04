'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/store/wallet';
import { Button, PasswordField, Icon } from '@/components/ui';
import { lockedForMs, recordFailure, resetLockout } from '@/lib/lockout';

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function UnlockScreen() {
  const { unlock } = useWalletStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockMs, setLockMs] = useState(() => lockedForMs());

  // Tick down the cooldown while locked.
  useEffect(() => {
    if (lockMs <= 0) return;
    const id = setInterval(() => setLockMs(lockedForMs()), 500);
    return () => clearInterval(id);
  }, [lockMs]);

  const locked = lockMs > 0;
  const lockSecs = Math.ceil(lockMs / 1000);

  const handleUnlock = async () => {
    if (locked || !password) return;
    setLoading(true);
    setError('');
    try {
      const ok = await unlock(password);
      if (ok) {
        resetLockout();
      } else {
        const remaining = recordFailure();
        setLockMs(remaining);
        setError(remaining > 0 ? 'Too many attempts' : 'Incorrect password');
      }
    } catch {
      setError('Failed to unlock');
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: 'var(--grad-hero)', paddingTop: 'var(--ward-safe-top)' }}
    >
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: EASE }}
          className="flex flex-col items-center"
        >
          {/* Glass medallion */}
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
            <div className="absolute w-28 h-28 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 84, height: 84, borderRadius: 28,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.22)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <Icon name="shield-lock" size={38} strokeWidth={1.4} className="text-white" />
            </div>
          </div>

          <h1 className="font-display text-[2.5rem] leading-[1.05] text-white tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-[0.9375rem] text-white/55 max-w-[16rem]">
            Enter your password to unlock Ward
          </p>
        </motion.div>
      </div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.5, ease: EASE }}
        className="flex-shrink-0 mx-4 mb-4 rounded-[var(--radius-xl)] px-5 pt-6 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]"
        style={{ background: 'var(--c-bg)', boxShadow: '0 -10px 44px rgba(0,0,0,0.22)' }}
      >
        <PasswordField
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          error={error || undefined}
          disabled={locked}
          autoFocus
        />
        {locked && (
          <p className="text-xs text-warning text-center flex items-center justify-center gap-1.5 mt-3">
            <Icon name="lock" size={13} />
            Too many attempts — try again in {lockSecs}s
          </p>
        )}
        <Button fullWidth loading={loading} disabled={!password || locked} onClick={handleUnlock} className="mt-4">
          {locked ? `Locked · ${lockSecs}s` : 'Unlock'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
