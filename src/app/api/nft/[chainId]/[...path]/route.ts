// ============================================================
// Ward — API: NFT REST proxy
// ============================================================
// Forwards Alchemy NFT API (v3) GET requests with a server-only key.
// The trailing path + query string are passed through verbatim, e.g.
//   /api/nft/11155111/getNFTsForOwner?owner=0x..&withMetadata=true

import { NextRequest } from 'next/server';
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit';

const RATE_MAX = 120;
const RATE_WINDOW_MS = 60_000;

const SUBDOMAIN: Record<string, string> = {
  '11155111': 'eth-sepolia',
  '84532': 'base-sepolia',
  '11155420': 'opt-sepolia',
  '421614': 'arb-sepolia',
  '80002': 'polygon-amoy',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chainId: string; path: string[] }> },
) {
  const limit = rateLimit(clientIp(req), RATE_MAX, RATE_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { chainId, path } = await params;
  const sub = SUBDOMAIN[chainId];
  if (!sub) {
    return Response.json({ error: 'Unsupported chain' }, { status: 400 });
  }

  const key = process.env.ALCHEMY_KEY;
  if (!key) {
    return Response.json({ error: 'NFT provider not configured' }, { status: 503 });
  }

  // The path is user-controlled, so constrain each segment to a safe charset.
  // This blocks path traversal (`..`, encoded slashes) and keeps the request
  // scoped to a single Alchemy NFT endpoint name.
  if (path.length !== 1 || !/^[A-Za-z0-9_-]+$/.test(path[0])) {
    return Response.json({ error: 'Invalid NFT endpoint' }, { status: 400 });
  }

  const search = req.nextUrl.search; // preserves ?owner=..&withMetadata=..
  const url = `https://${sub}.g.alchemy.com/nft/v3/${key}/${path[0]}${search}`;

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return Response.json({ error: 'Upstream NFT API unreachable' }, { status: 502 });
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
