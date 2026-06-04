// ============================================================
// Ward — Activity persistence
// ============================================================
// Local transaction history in its own IndexedDB database. This
// is public chain data (no key material), kept on-device so the
// user can see what they've sent across sessions.

import { openDB, type IDBPDatabase } from 'idb';
import type { ActivityTx, ActivityStatus } from './types';

const DB_NAME = 'ward-activity';
const DB_VERSION = 1;
const STORE = 'transactions';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'hash' });
          store.createIndex('by-account', ['from', 'chainId']);
        }
      },
    });
  }
  return dbPromise;
}

export async function recordTx(tx: ActivityTx): Promise<void> {
  const db = await getDb();
  await db.put(STORE, tx);
}

export async function setTxStatus(hash: string, status: ActivityStatus): Promise<void> {
  const db = await getDb();
  const existing = (await db.get(STORE, hash)) as ActivityTx | undefined;
  if (existing) await db.put(STORE, { ...existing, status });
}

export async function listTxs(from: `0x${string}`, chainId: number): Promise<ActivityTx[]> {
  const db = await getDb();
  const all = (await db.getAllFromIndex(STORE, 'by-account', [from, chainId])) as ActivityTx[];
  return all.sort((a, b) => b.timestamp - a.timestamp);
}
