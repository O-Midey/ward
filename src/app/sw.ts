/// <reference lib="webworker" />

// ============================================================
// Ward — Service Worker
// ============================================================
// Precaches the app shell and applies sensible runtime caching
// so Ward is installable and works offline. Compiled by
// @serwist/next from this source into public/sw.js at build.
//
// Note: this is intentionally a *shell* cache only. No wallet
// state, balances, or key material is cached — those come from
// IndexedDB and live network calls, never the SW cache.
//
// This file is excluded from the app tsconfig (see tsconfig.json)
// because it targets the WebWorker lib, not the DOM. @serwist/next
// scans for the literal `self.__SW_MANIFEST` token to inject the
// precache list, so keep that reference verbatim.

import { defaultCache } from '@serwist/next/worker';
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected by @serwist/next at build time.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Don't auto-activate a new worker mid-session — wait for the user to
  // accept the update (the app shows a "Reload" prompt), then skip waiting.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

serwist.addEventListeners();
