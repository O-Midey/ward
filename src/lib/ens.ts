// ============================================================
// Ward — ENS resolution
// ============================================================
// Resolves `.eth` names to addresses. ENS lives on Ethereum
// mainnet, so we always resolve there even when the active chain
// is a testnet — matching how production wallets behave.

import { createPublicClient, http, isAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

let client: ReturnType<typeof createPublicClient> | null = null;

function mainnetClient() {
  if (client) return client;
  // Resolve through the same-origin RPC proxy (chainId 1) so no key is exposed;
  // the proxy falls back to a public mainnet RPC if Alchemy is unavailable.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  client = createPublicClient({ chain: mainnet, transport: http(`${origin}/api/rpc/1`) });
  return client;
}

export function isEnsName(value: string): boolean {
  return /\.eth$/i.test(value.trim());
}

const cache = new Map<string, `0x${string}` | null>();

/** Resolve an ENS name to an address (mainnet). Returns null if unresolved. */
export async function resolveEns(name: string): Promise<`0x${string}` | null> {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  try {
    const address = await mainnetClient().getEnsAddress({ name: normalize(key) });
    const result = address && isAddress(address) ? address : null;
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
