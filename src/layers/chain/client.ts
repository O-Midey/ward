// ============================================================
// Ward — Chain Layer: Client Factory
// ============================================================
// Creates and caches viem PublicClient instances per chain.
// Uses a fallback transport: the Alchemy endpoint first, then the
// chain's public RPC, so a single provider outage or rate-limit
// doesn't take the whole app down.

import { createPublicClient, http } from 'viem';
import type { PublicClient } from 'viem';
import type { WardChain } from '@/lib/types';

const clients = new Map<number, PublicClient>();

/**
 * Get (or create) a viem PublicClient for the given chain.
 * Clients are cached by chain ID for the session.
 */
export function getPublicClient(chain: WardChain): PublicClient {
  const cached = clients.get(chain.id);
  if (cached) return cached;

  // All RPC traffic goes through a same-origin proxy so the API key never
  // ships to the browser; the proxy itself falls back to a public RPC if
  // Alchemy is down (see src/app/api/rpc/[chainId]).
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const client = createPublicClient({
    chain: chain.viemChain,
    transport: http(`${origin}/api/rpc/${chain.id}`),
  });

  clients.set(chain.id, client);
  return client;
}

/**
 * Clear all cached clients (e.g. on network switch or lock).
 */
export function clearClients(): void {
  clients.clear();
}
