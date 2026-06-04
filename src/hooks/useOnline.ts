"use client";

// ============================================================
// Ward — useOnline
// ============================================================
// Tracks the browser's online/offline status so the UI can warn when
// balances and transactions can't reach the network.

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // client: live status
    () => true, // server / first paint: assume online to avoid a banner flash
  );
}
