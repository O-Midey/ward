// ============================================================
// Ward — Test Setup
// ============================================================
// Polyfill IndexedDB for jsdom using fake-indexeddb.

import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

// Replace jsdom's crypto polyfill with Node's native Web Crypto.
// jsdom's crypto lives in a separate realm and rejects ArrayBuffer
// instances from the Node.js realm via instanceof checks.
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});
