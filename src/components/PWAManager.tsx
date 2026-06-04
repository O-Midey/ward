'use client';

// ============================================================
// Ward — PWA Manager
// ============================================================
// Watches the service worker for updates and captures the
// install prompt. Renders a "new version" toast; the Settings
// screen exposes the install button. No-ops in dev (no SW).

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePwaStore, type BeforeInstallPromptEvent } from '@/store/pwa';
import { Icon } from '@/components/ui';

export function PWAManager() {
  const { updateReady, setUpdateReady, setInstallEvent } = usePwaStore();

  useEffect(() => {
    // Capture the install prompt for a custom "Install" affordance.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Watch for a waiting service worker (a new version).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      });
      // When the new worker takes control, reload once to get fresh assets.
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [setInstallEvent, setUpdateReady]);

  const applyUpdate = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <AnimatePresence>
      {updateReady && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[60]"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] bg-surface" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <span className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <Icon name="sparkle" size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text">New version available</div>
              <div className="text-xs text-text-tertiary">Reload to get the latest Ward.</div>
            </div>
            <button onClick={applyUpdate} className="text-sm font-semibold text-accent px-3 py-1.5 press shrink-0">
              Reload
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
