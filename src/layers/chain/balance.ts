// ============================================================
// Ward — Chain Layer: Balance
// ============================================================
// Fetch native token balances for an address on a given chain.

import { formatEther } from 'viem';
import type { WardChain } from '@/lib/types';
import { getPublicClient } from './client';

export interface BalanceResult {
  wei: bigint;
  formatted: string;
  symbol: string;
}

/**
 * Get the native token balance for an address.
 */
export async function getBalance(
  address: `0x${string}`,
  chain: WardChain,
): Promise<BalanceResult> {
  const client = getPublicClient(chain);
  const wei = await client.getBalance({ address });

  return {
    wei,
    formatted: formatEther(wei),
    symbol: chain.nativeToken,
  };
}

/**
 * Get the transaction count (nonce) for an address.
 */
export async function getNonce(
  address: `0x${string}`,
  chain: WardChain,
): Promise<number> {
  const client = getPublicClient(chain);
  return client.getTransactionCount({ address });
}
