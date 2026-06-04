'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  dismissible?: boolean;
  children: ReactNode;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, title, subtitle, dismissible = true, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to dismiss + focus trap so keyboard/screen-reader users stay
  // contained within the dialog.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusables = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('disabled'))
        : [];

    (focusables()[0] ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) { e.preventDefault(); panel?.focus(); return; }
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 sheet-backdrop"
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className="relative w-full max-w-lg bg-surface rounded-t-[var(--radius-xl)]
                       pb-[max(env(safe-area-inset-bottom,0px),1rem)] max-h-[90vh] overflow-y-auto outline-none"
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3.5 pb-2">
              <div className="w-9 h-[3px] rounded-full bg-[var(--c-border)]" />
            </div>

            {/* Sticky header */}
            {(title || subtitle) && (
              <div className="px-6 pt-1 pb-4 text-center sticky top-0 chrome-blur z-10">
                {title && <h2 className="font-display text-[1.25rem] text-text">{title}</h2>}
                {subtitle && <p className="text-[0.75rem] text-text-tertiary mt-0.5">{subtitle}</p>}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
