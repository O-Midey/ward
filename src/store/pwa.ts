// ============================================================
// Ward — Zustand Store: PWA
// ============================================================
// Cross-component PWA state: a captured install prompt and a
// "new version ready" flag. Populated by <PWAManager/>; read by
// Settings (install button) and the update toast.

import { create } from 'zustand';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  installEvent: BeforeInstallPromptEvent | null;
  updateReady: boolean;
  setInstallEvent: (e: BeforeInstallPromptEvent | null) => void;
  setUpdateReady: (v: boolean) => void;
}

export const usePwaStore = create<PwaState>((set) => ({
  installEvent: null,
  updateReady: false,
  setInstallEvent: (e) => set({ installEvent: e }),
  setUpdateReady: (v) => set({ updateReady: v }),
}));
