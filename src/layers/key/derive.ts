// ============================================================
// Ward — Key Management Layer: HD Derivation
// ============================================================
// BIP-32 / BIP-44 hierarchical deterministic derivation.
// Path: m/44'/60'/0'/0/{index} — standard Ethereum account path.

import { HDKey } from '@scure/bip32';
import { privateKeyToAccount } from 'viem/accounts';
import type { WardAccount } from '@/lib/types';

const BASE_PATH = "m/44'/60'/0'/0";

/**
 * Derive an Ethereum account from a BIP-39 seed at a given index.
 * Returns the viem LocalAccount ready for signing.
 */
export function deriveAccount(seed: Uint8Array, index: number) {
  const hdkey = HDKey.fromMasterSeed(seed);
  const path = `${BASE_PATH}/${index}`;
  const child = hdkey.derive(path);

  if (!child.privateKey) {
    throw new Error(`Failed to derive private key at index ${index}`);
  }

  const pk = privateKeyToAccount(
    `0x${Array.from(child.privateKey)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}` as `0x${string}`
  );

  return pk;
}

/**
 * Derive multiple accounts from a seed.
 */
export function deriveAccounts(seed: Uint8Array, count: number): WardAccount[] {
  const accounts: WardAccount[] = [];

  for (let i = 0; i < count; i++) {
    const account = deriveAccount(seed, i);
    accounts.push({
      index: i,
      address: account.address,
      name: `Account ${i + 1}`,
      path: `${BASE_PATH}/${i}`,
    });
  }

  return accounts;
}
