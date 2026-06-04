// ============================================================
// Ward — Zustand Store: Activity
// ============================================================
// Reactive transaction history, persisted to IndexedDB so the
// Activity view survives reloads and lock/unlock cycles.

import { create } from 'zustand';
import type { ActivityTx, ActivityStatus, WardChain } from '@/lib/types';
import { recordTx, setTxStatus, listTxs } from '@/lib/activity-db';
import { getTransactionReceipt } from '@/layers/chain';

interface ActivityState {
  txs: ActivityTx[];
  loadFor: (from: `0x${string}`, chainId: number) => Promise<void>;
  add: (tx: ActivityTx) => Promise<void>;
  updateStatus: (hash: string, status: ActivityStatus) => Promise<void>;
  /** Re-check receipts for any txs still marked pending (e.g. after reload). */
  reconcile: (chain: WardChain) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  txs: [],

  loadFor: async (from, chainId) => {
    const txs = await listTxs(from, chainId);
    set({ txs });
  },

  add: async (tx) => {
    await recordTx(tx);
    set({ txs: [tx, ...get().txs.filter((t) => t.hash !== tx.hash)] });
  },

  updateStatus: async (hash, status) => {
    await setTxStatus(hash, status);
    set({ txs: get().txs.map((t) => (t.hash === hash ? { ...t, status } : t)) });
  },

  reconcile: async (chain) => {
    const pending = get().txs.filter((t) => t.status === 'pending' && t.chainId === chain.id);
    await Promise.all(
      pending.map(async (t) => {
        try {
          const receipt = await getTransactionReceipt(t.hash, chain);
          if (receipt) await get().updateStatus(t.hash, receipt.status === 'success' ? 'confirmed' : 'failed');
        } catch {
          // Receipt not found yet → still pending.
        }
      }),
    );
  },
}));
