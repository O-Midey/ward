"use client";

// ============================================================
// Ward — OfflineBanner
// ============================================================
// Thin banner that slides in below the status bar when the device loses
// its network connection, so a blank balance reads as "offline" rather
// than "empty wallet".

import { AnimatePresence, motion } from "framer-motion";
import { useOnline } from "@/hooks/useOnline";
import { Icon } from "@/components/ui";

export function OfflineBanner() {
  const online = useOnline();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute left-0 right-0 z-40 flex items-center justify-center gap-2 py-2 text-xs font-medium text-on-accent"
          style={{ top: "var(--ward-safe-top)", background: "var(--c-warning)" }}
          role="status"
        >
          <Icon name="alert" size={14} className="shrink-0" />
          You&apos;re offline — balances may be out of date
        </motion.div>
      )}
    </AnimatePresence>
  );
}
