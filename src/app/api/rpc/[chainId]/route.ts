// ============================================================
// Ward — API: JSON-RPC proxy
// ============================================================
// Forwards JSON-RPC requests to Alchemy using a server-only key, so the
// API key never reaches the browser. Used by the viem PublicClient, the
// Alchemy enhanced methods (token balances, transfer history), and ENS
// resolution on mainnet.
//
// Fallback is handled here, server-side: if Alchemy is unconfigured or
// unreachable we retry the chain's public RPC. The browser therefore only
// ever connects to this same origin, which lets the CSP lock connect-src
// down to 'self'.

import { NextRequest } from 'next/server';
import {
  mainnet,
  sepolia,
  baseSepolia,
  optimismSepolia,
  arbitrumSepolia,
  polygonAmoy,
} from 'viem/chains';
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit';

// The home screen fires several queries and polls every 15s across accounts,
// so the per-IP budget is generous — it's an abuse cap, not a throttle.
const RATE_MAX = 300;
const RATE_WINDOW_MS = 60_000;

// chainId → Alchemy subdomain. Kept in sync with src/lib/types.ts (+ mainnet
// for ENS).
const SUBDOMAIN: Record<string, string> = {
  '1': 'eth-mainnet',
  '11155111': 'eth-sepolia',
  '84532': 'base-sepolia',
  '11155420': 'opt-sepolia',
  '421614': 'arb-sepolia',
  '80002': 'polygon-amoy',
};

// Public RPC backstops (no key) used when Alchemy is down or unconfigured.
const PUBLIC_RPC: Record<string, string> = {
  '1': mainnet.rpcUrls.default.http[0],
  '11155111': sepolia.rpcUrls.default.http[0],
  '84532': baseSepolia.rpcUrls.default.http[0],
  '11155420': optimismSepolia.rpcUrls.default.http[0],
  '421614': arbitrumSepolia.rpcUrls.default.http[0],
  '80002': polygonAmoy.rpcUrls.default.http[0],
};

async function forward(url: string, body: string): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return res;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chainId: string }> },
) {
  const limit = rateLimit(clientIp(req), RATE_MAX, RATE_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { chainId } = await params;
  const sub = SUBDOMAIN[chainId];
  if (!sub) {
    return Response.json({ error: 'Unsupported chain' }, { status: 400 });
  }

  const body = await req.text();
  const key = process.env.ALCHEMY_KEY;

  // Try the keyed Alchemy endpoint first, then the public RPC backstop.
  const targets = [
    ...(key ? [`https://${sub}.g.alchemy.com/v2/${key}`] : []),
    ...(PUBLIC_RPC[chainId] ? [PUBLIC_RPC[chainId]] : []),
  ];

  for (const target of targets) {
    try {
      const upstream = await forward(target, body);
      // Pass the JSON-RPC envelope straight through (incl. provider errors).
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Try the next endpoint.
    }
  }

  return Response.json({ error: 'All RPC providers unreachable' }, { status: 502 });
}
