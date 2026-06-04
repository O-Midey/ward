// ============================================================
// Ward — Service Layer: Transfer History
// ============================================================
// On-chain activity (incoming + outgoing) via Alchemy's
// getAssetTransfers. This is the authoritative history shown in
// the Activity tab; locally-recorded pending sends are overlaid
// until they appear here.

import type { WardChain, HistoryItem } from '@/lib/types';
import { alchemyGet } from './alchemy';

interface RawTransfer {
  uniqueId: string;
  hash: `0x${string}`;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  category: HistoryItem['category'];
  tokenId?: string | null;
  metadata?: { blockTimestamp?: string };
}

const CATEGORIES = ['external', 'erc20', 'erc721', 'erc1155'];

async function fetchTransfers(
  chain: WardChain,
  params: Record<string, unknown>,
): Promise<RawTransfer[]> {
  const data = (await alchemyGet(chain, 'alchemy_getAssetTransfers', [
    {
      fromBlock: '0x0',
      toBlock: 'latest',
      category: CATEGORIES,
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: '0x19', // 25
      order: 'desc',
      ...params,
    },
  ])) as { transfers?: RawTransfer[] };
  return data?.transfers ?? [];
}

/**
 * Fetch the most recent incoming + outgoing transfers for an address.
 * Errors propagate so the UI can show an error state.
 */
export async function getTransferHistory(
  address: `0x${string}`,
  chain: WardChain,
): Promise<HistoryItem[]> {
  const [outgoing, incoming] = await Promise.all([
    fetchTransfers(chain, { fromAddress: address }),
    fetchTransfers(chain, { toAddress: address }),
  ]);

  const lower = address.toLowerCase();
  const seen = new Set<string>();
  const items: HistoryItem[] = [];

  for (const t of [...outgoing, ...incoming]) {
    if (seen.has(t.uniqueId)) continue;
    seen.add(t.uniqueId);

    const isOut = t.from?.toLowerCase() === lower;
    const isIn = t.to?.toLowerCase() === lower;
    const direction: HistoryItem['direction'] = isOut && isIn ? 'self' : isOut ? 'out' : 'in';

    items.push({
      id: t.uniqueId,
      hash: t.hash,
      direction,
      counterparty: (isOut ? t.to : t.from) ?? '',
      amount: t.value != null ? trimAmount(t.value) : t.tokenId ? `#${parseInt(t.tokenId, 16)}` : '',
      asset: t.asset ?? (t.category === 'erc721' ? 'NFT' : ''),
      category: t.category,
      timestamp: t.metadata?.blockTimestamp ? Date.parse(t.metadata.blockTimestamp) : 0,
    });
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

function trimAmount(value: number): string {
  if (value === 0) return '0';
  if (value < 0.0001) return '<0.0001';
  if (value < 1) return value.toFixed(4);
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
