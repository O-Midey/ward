'use client';

// ============================================================
// Ward — useSendTransaction
// ============================================================
// Owns the full send lifecycle so screens stay presentational:
//   prepare()  → validate, decode, estimate gas (→ review)
//   confirm()  → sign, broadcast, record activity, track receipt
// On confirmation it invalidates balance/token queries and
// updates the persisted activity record.

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useWalletStore } from '@/store/wallet';
import { useActivityStore } from '@/store/activity';
import { deriveAccount, mnemonicToSeed, signTransaction } from '@/layers/key';
import {
  buildTransaction,
  broadcastTransaction,
  estimateGas,
  waitForReceipt,
  type GasEstimate,
  type GasSpeed,
} from '@/layers/chain';
import { decodeCalldata } from '@/layers/services';
import type { SendTxRequest, DecodedCall, ActivityTx } from '@/lib/types';

export type TxStatus =
  | 'idle'
  | 'estimating'
  | 'review'
  | 'signing'
  | 'broadcasting'
  | 'confirmed'
  | 'failed';

export interface PreparedTx {
  request: SendTxRequest;
  decoded: DecodedCall;
  gas: GasEstimate;
}

function activityLabel(decoded: DecodedCall, valueWei: string, nativeToken: string): string {
  switch (decoded.type) {
    case 'erc20_approve':
      return decoded.params?.isUnlimited ? 'Unlimited approval' : 'Token approval';
    case 'erc20_transfer':
      return `Sent ${decoded.params?.amount ?? ''} tokens`.trim();
    case 'contract_call':
      return decoded.functionName ? `Called ${decoded.functionName}` : 'Contract call';
    case 'unknown':
      return 'Contract interaction';
    default:
      return `${formatEther(BigInt(valueWei))} ${nativeToken}`;
  }
}

export function useSendTransaction() {
  const queryClient = useQueryClient();
  const addActivity = useActivityStore((s) => s.add);
  const updateActivityStatus = useActivityStore((s) => s.updateStatus);

  const [status, setStatus] = useState<TxStatus>('idle');
  const [prepared, setPrepared] = useState<PreparedTx | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setPrepared(null);
    setTxHash(null);
    setError(null);
  }, []);

  /**
   * Build + decode + estimate gas. `valueWei` is the native value in wei
   * (already parsed) — "0" for token/NFT sends, where `data` carries the
   * encoded transfer. Returns the prepared tx or null on failure.
   */
  const prepare = useCallback(
    async (to: string, valueWei: string, data?: string): Promise<PreparedTx | null> => {
      const { getActiveAccount, activeChain } = useWalletStore.getState();
      const account = getActiveAccount();
      if (!account) return null;

      setStatus('estimating');
      setError(null);
      try {
        const request: SendTxRequest = {
          from: account.address,
          to: to as `0x${string}`,
          value: valueWei,
          chainId: activeChain.id,
          data: (data as `0x${string}` | undefined) || undefined,
        };
        const decoded = decodeCalldata(request.data, request.to);
        const gas = await estimateGas(request, activeChain);
        const next = { request, decoded, gas };
        setPrepared(next);
        setStatus('review');
        return next;
      } catch (e) {
        setStatus('failed');
        setError(humanizeError(e));
        return null;
      }
    },
    [],
  );

  /** Sign + broadcast the prepared tx, then track its receipt. */
  const confirm = useCallback(async (speed: GasSpeed = 'normal') => {
    const { getActiveAccount, activeChain, mnemonic } = useWalletStore.getState();
    const account = getActiveAccount();
    if (!prepared || !account || !mnemonic) return;

    setStatus('signing');
    setError(null);
    try {
      const seed = mnemonicToSeed(mnemonic);
      const signer = deriveAccount(seed, account.index);
      const built = await buildTransaction(prepared.request, activeChain, speed);
      const signed = await signTransaction(signer, { ...built, data: prepared.request.data });

      setStatus('broadcasting');
      const hash = await broadcastTransaction(signed, activeChain);
      setTxHash(hash);
      setStatus('confirmed');

      const record: ActivityTx = {
        hash,
        from: prepared.request.from,
        to: prepared.request.to,
        value: prepared.request.value,
        chainId: activeChain.id,
        kind: prepared.decoded.type,
        label: activityLabel(prepared.decoded, prepared.request.value, activeChain.nativeToken),
        status: 'pending',
        timestamp: Date.now(),
      };
      await addActivity(record);

      // Track the receipt off the critical path.
      waitForReceipt(hash, activeChain)
        .then((receipt) => {
          updateActivityStatus(hash, receipt.status === 'success' ? 'confirmed' : 'failed');
          queryClient.invalidateQueries({ queryKey: ['balance', account.address, activeChain.id] });
          queryClient.invalidateQueries({ queryKey: ['tokens', account.address, activeChain.id] });
        })
        .catch(() => updateActivityStatus(hash, 'failed'));

      return hash;
    } catch (e) {
      setStatus('failed');
      setError(humanizeError(e));
      return null;
    }
  }, [prepared, addActivity, updateActivityStatus, queryClient]);

  return { status, prepared, txHash, error, prepare, confirm, reset };
}

function humanizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : 'Transaction failed';
  if (/insufficient funds/i.test(msg)) return 'Insufficient funds for amount + network fee.';
  if (/nonce/i.test(msg)) return 'Nonce error — try again in a moment.';
  if (/gas required exceeds|execution reverted/i.test(msg)) return 'Transaction would revert. Check the recipient and data.';
  // Keep the first line only — viem errors can be very long.
  return msg.split('\n')[0].slice(0, 140);
}
