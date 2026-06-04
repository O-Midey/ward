// ============================================================
// Ward — Service Layer: NFTs
// ============================================================
// Fetches NFTs via Alchemy NFT API v3 with graceful media fallbacks.

import type { WardChain } from '@/lib/types';
import { alchemyNftGet } from './alchemy';
import type { NFTAsset } from '@/lib/types';

interface AlchemyNft {
  contract: { address: string };
  tokenId: string;
  name?: string;
  image?: { cachedUrl?: string; originalUrl?: string };
  collection?: { name?: string };
}

/**
 * Fetch NFTs for an address on a chain.
 * Handles broken/IPFS media with fallbacks.
 */
export async function getNFTs(
  address: `0x${string}`,
  chain: WardChain,
): Promise<NFTAsset[]> {
  // Errors propagate so the UI can distinguish "fetch failed" from
  // "no NFTs" rather than showing an empty state for both.
  const data = (await alchemyNftGet(
    chain,
    `getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=50`,
  )) as { ownedNfts: AlchemyNft[] };

  if (!data?.ownedNfts) return [];

  return data.ownedNfts.map((nft) => ({
    contractAddress: nft.contract.address,
    tokenId: nft.tokenId,
    name: nft.name || `#${nft.tokenId.slice(0, 8)}`,
    image: resolveImage(nft),
    collection: nft.collection?.name,
  }));
}

/**
 * Resolve the best available image URL, handling IPFS and broken links.
 */
function resolveImage(nft: AlchemyNft): string | undefined {
  // Prefer Alchemy's cached URL (works even if IPFS is down)
  if (nft.image?.cachedUrl) return nft.image.cachedUrl;

  const original = nft.image?.originalUrl;
  if (!original) return undefined;

  // Rewrite IPFS URLs to a public gateway
  if (original.startsWith('ipfs://')) {
    return original.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  return original;
}
