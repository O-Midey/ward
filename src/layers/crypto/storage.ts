// ============================================================
// Ward — Crypto Layer: IndexedDB Storage
// ============================================================
// Persists ONLY ciphertext in IndexedDB. No plaintext keys ever
// touch disk. Uses the idb library for a promise-based API.

import { openDB, type IDBPDatabase } from 'idb';
import type { EncryptedVault } from '@/lib/types';

const DB_NAME = 'ward-vault';
const DB_VERSION = 1;
const STORE_NAME = 'vault';

let db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    },
  });
  return db;
}

const VAULT_KEY = 'encrypted-seed';

/**
 * Store the encrypted vault in IndexedDB.
 * Only ciphertext is written — no plaintext keys.
 */
export async function storeEncryptedVault(vault: EncryptedVault): Promise<void> {
  const database = await getDb();
  await database.put(STORE_NAME, vault, VAULT_KEY);
}

/**
 * Retrieve the encrypted vault from IndexedDB.
 * Returns null if no vault exists yet.
 */
export async function getEncryptedVault(): Promise<EncryptedVault | null> {
  const database = await getDb();
  return (await database.get(STORE_NAME, VAULT_KEY)) ?? null;
}

/**
 * Check whether a vault exists in storage.
 */
export async function hasVault(): Promise<boolean> {
  const vault = await getEncryptedVault();
  return vault !== null;
}

/**
 * Delete the encrypted vault entirely.
 * Used for wallet removal / reset.
 */
export async function deleteVault(): Promise<void> {
  const database = await getDb();
  await database.delete(STORE_NAME, VAULT_KEY);
}
