// ============================================================
// Ward — Service Layer: Alchemy Client
// ============================================================
// Wraps Alchemy's enhanced APIs for token and NFT data.

import type { WardChain } from '@/lib/types';

// All Alchemy traffic is proxied through same-origin API routes so the API key
// stays server-side (see src/app/api/rpc and src/app/api/nft). In the browser
// we build an absolute URL from the current origin; on the server (e.g. import
// account discovery during SSR) we fall back to a relative path.
function origin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

function getBaseUrl(chain: WardChain): string {
  return `${origin()}/api/rpc/${chain.id}`;
}

function getNftBaseUrl(chain: WardChain): string {
  return `${origin()}/api/nft/${chain.id}`;
}

export async function alchemyGet(
  chain: WardChain,
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  const url = getBaseUrl(chain);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Alchemy request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Alchemy error: ${data.error.message}`);
  }

  return data.result;
}

export async function alchemyNftGet(
  chain: WardChain,
  path: string,
): Promise<unknown> {
  const url = `${getNftBaseUrl(chain)}/${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Alchemy NFT API failed: ${response.status}`);
  }

  return response.json();
}
