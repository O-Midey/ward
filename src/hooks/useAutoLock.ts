'use client';

// ============================================================
// Ward — useAutoLock
// ============================================================
// Locks the wallet after a configurable idle period, and after
// a short grace window once the tab is hidden/backgrounded.
// The grace window avoids nuking an in-flight flow when the OS
// briefly steals focus (file picker, password manager, etc.).

import { useCallback, useEffect, useRef } from 'react';
import { useWalletStore } from '@/store/wallet';

const HIDDEN_GRACE_MS = 30_000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function useAutoLock() {
  const isLocked = useWalletStore((s) => s.isLocked);
  const lock = useWalletStore((s) => s.lock);
  const autoLockMs = useWalletStore((s) => s.autoLockMs);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!isLocked) idleTimer.current = setTimeout(() => lock(), autoLockMs);
  }, [isLocked, lock, autoLockMs]);

  // Idle timer driven by user activity.
  useEffect(() => {
    resetIdle();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  // Lock shortly after the tab is hidden; cancel if it comes back.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !isLocked) {
        hiddenTimer.current = setTimeout(() => lock(), HIDDEN_GRACE_MS);
      } else if (hiddenTimer.current) {
        clearTimeout(hiddenTimer.current);
        hiddenTimer.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
    };
  }, [isLocked, lock]);
}
