// ============================================================
// Ward — Service Layer: Token Balances
// ============================================================
// Fetches ERC-20 token balances and metadata via Alchemy.

import type { WardChain } from '@/lib/types';
import { alchemyGet } from './alchemy';
import type { TokenBalance } from '@/lib/types';

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

/**
 * Fetch all ERC-20 token balances for an address on a chain.
 */
export async function getTokenBalances(
  address: `0x${string}`,
  chain: WardChain,
): Promise<TokenBalance[]> {
  // Note: errors are intentionally NOT swallowed here. An auth/network/
  // rate-limit failure must surface to the UI as an error state rather than
  // masquerading as an empty wallet. Only genuinely-empty results return [].
  const data = (await alchemyGet(chain, 'alchemy_getTokenBalances', [
    address,
    'erc20',
  ])) as { tokenBalances: AlchemyTokenBalance[] };

  if (!data?.tokenBalances) return [];

  const held = data.tokenBalances.filter(
    (tb) => !tb.error && BigInt(tb.tokenBalance) !== 0n,
  );

  // Fetch metadata in parallel; a single token's bad metadata shouldn't
  // drop the whole list, so per-token failures degrade gracefully.
  const tokens = await Promise.all(
    held.map(async (tb): Promise<TokenBalance> => {
      try {
        const meta = (await alchemyGet(chain, 'alchemy_getTokenMetadata', [
          tb.contractAddress,
        ])) as AlchemyTokenMetadata;
        return {
          contractAddress: tb.contractAddress,
          name: meta.name || 'Unknown Token',
          symbol: meta.symbol || '???',
          decimals: meta.decimals ?? 18,
          balance: tb.tokenBalance,
          logo: meta.logo,
        };
      } catch {
        return {
          contractAddress: tb.contractAddress,
          name: 'Unknown Token',
          symbol: '???',
          decimals: 18,
          balance: tb.tokenBalance,
        };
      }
    }),
  );

  return tokens;
}
