# Deploying Ward

Ward is a Next.js app with two server route handlers (`/api/rpc`, `/api/nft`)
that proxy Alchemy so the API key never reaches the browser. **It therefore
needs a server runtime — it can't be hosted as a pure static export.** Any
Next.js-capable host works (Vercel, Netlify, a Node server, etc.).

## 1. Rotate the Alchemy key (do this first)

The previous key was shipped in the client bundle, so treat it as compromised:

1. In the [Alchemy dashboard](https://dashboard.alchemy.com), create a **new**
   API key (or roll the existing one).
2. Enable the networks Ward uses: **Eth Sepolia, Base Sepolia, Optimism
   Sepolia, Arbitrum Sepolia, Polygon Amoy**, plus **Eth Mainnet** (ENS lookups).
3. Under the key's settings, restrict it (allowed domains / networks) so a leak
   is low-impact.

## 2. Set the environment variable

Set **`ALCHEMY_KEY`** (server-only — no `NEXT_PUBLIC_` prefix) in your host:

- **Vercel:** Project → Settings → Environment Variables → add `ALCHEMY_KEY`
  for Production (and Preview, if used).
- **Local:** copy `.env.example` to `.env.local` and fill it in.

See `.env.example` for the full description.

## 3. Build & deploy

```bash
npm ci
npm run build   # builds with the webpack/Serwist PWA pipeline
npm start       # or let your host run the build + start
```

On Vercel, just connect the repo — it runs `npm run build` and serves the route
handlers as serverless functions automatically. No `vercel.json` is required.

## What's already handled

- **Key isolation** — Alchemy key is server-only; verified absent from the
  client bundle.
- **RPC fallback** — the proxy falls back to public RPCs if Alchemy is down, so
  native balances/sends keep working (enhanced token/NFT data degrades only).
- **Rate limiting** — per-IP, in-memory limits on both proxy routes
  (`src/lib/rate-limit.ts`).
- **Security headers** — CSP (`connect-src 'self'`), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy` — see `next.config.ts`.

## Recommended for high-traffic / public deploys

- **Distributed rate limiting** — the built-in limiter is per server instance.
  For strict global limits, back `rate-limit.ts` with Vercel KV or Upstash Redis.
- Keep Ward on **testnets only**, as the UI states.
