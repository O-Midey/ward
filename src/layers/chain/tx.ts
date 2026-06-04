// ============================================================
// Ward — Chain Layer: Transactions
// ============================================================
// Build, estimate, broadcast, and track EVM transactions.
// The signing handoff goes to the Key layer.

import { parseEther, type TransactionReceipt } from 'viem';
import type { SendTxRequest, WardChain } from '@/lib/types';
import { getPublicClient } from './client';

export interface GasEstimate {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedTotal: bigint;
}

export interface BuiltTransaction {
  to: `0x${string}`;
  value: bigint;
  chainId: number;
  data?: `0x${string}`;
  nonce: number;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  gasLimit: bigint;
}

export type GasSpeed = 'slow' | 'normal' | 'fast';

// Percentage applied to the estimated EIP-1559 fees per speed tier.
const SPEED_PCT: Record<GasSpeed, bigint> = { slow: 90n, normal: 110n, fast: 150n };

/** Scale a fee by the chosen speed tier (integer math). */
export function applyGasSpeed(fee: bigint, speed: GasSpeed): bigint {
  return (fee * SPEED_PCT[speed]) / 100n;
}

/**
 * Parse an ETH amount string (e.g. "0.05") to wei as bigint.
 */
export function parseEthAmount(amount: string): bigint {
  return parseEther(amount);
}

/**
 * Estimate gas for a transaction.
 */
export async function estimateGas(
  tx: SendTxRequest,
  chain: WardChain,
): Promise<GasEstimate> {
  const client = getPublicClient(chain);

  const [gasLimit, feeData] = await Promise.all([
    client.estimateGas({
      to: tx.to,
      value: BigInt(tx.value),
      data: tx.data,
      account: tx.from,
    }),
    client.estimateFeesPerGas(),
  ]);

  const maxPriorityFee = feeData.maxPriorityFeePerGas ?? 1_000_000_000n;
  const maxFee = feeData.maxFeePerGas ?? maxPriorityFee * 2n;

  return {
    gasLimit: (gasLimit * 120n) / 100n, // 20% buffer
    maxFeePerGas: maxFee,
    maxPriorityFeePerGas: maxPriorityFee,
    estimatedTotal: ((gasLimit * 120n) / 100n) * maxFee,
  };
}

/**
 * Build a transaction object ready for signing.
 */
export async function buildTransaction(
  tx: SendTxRequest,
  chain: WardChain,
  speed: GasSpeed = 'normal',
): Promise<BuiltTransaction> {
  // 'pending' so back-to-back sends don't collide on the same nonce.
  const nonce = await getPublicClient(chain).getTransactionCount({
    address: tx.from,
    blockTag: 'pending',
  });
  const gas = await estimateGas(tx, chain);

  return {
    to: tx.to,
    value: BigInt(tx.value),
    chainId: tx.chainId,
    data: tx.data,
    nonce,
    maxFeePerGas: applyGasSpeed(gas.maxFeePerGas, speed),
    maxPriorityFeePerGas: applyGasSpeed(gas.maxPriorityFeePerGas, speed),
    gasLimit: gas.gasLimit,
  };
}

/**
 * Broadcast a signed transaction and return the hash.
 */
export async function broadcastTransaction(
  signedTx: `0x${string}`,
  chain: WardChain,
): Promise<`0x${string}`> {
  const client = getPublicClient(chain);
  const hash = await client.sendRawTransaction({
    serializedTransaction: signedTx,
  });
  return hash;
}

/**
 * Wait for a transaction receipt (confirmation).
 */
export async function waitForReceipt(
  hash: `0x${string}`,
  chain: WardChain,
): Promise<TransactionReceipt> {
  const client = getPublicClient(chain);
  return client.waitForTransactionReceipt({ hash });
}

/**
 * Get a transaction receipt by hash (may be null if pending).
 */
export async function getTransactionReceipt(
  hash: `0x${string}`,
  chain: WardChain,
): Promise<TransactionReceipt | null> {
  const client = getPublicClient(chain);
  return client.getTransactionReceipt({ hash });
}
