import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Wallets are high-value XSS targets, so we lock the
// page down as far as the app allows:
//   • script/style 'unsafe-inline' — required by Next's inline bootstrap and
//     the app's inline style attributes; 'unsafe-eval' only in dev (HMR).
//   • img/connect kept to https (+ data/blob for QR codes and token art, and
//     arbitrary https for RPC endpoints + NFT media).
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  // All RPC/NFT/token traffic is proxied through same-origin /api routes, so
  // the app never makes cross-origin fetch/XHR calls. (Token/NFT *images* are
  // <img> loads, governed by img-src above.)
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  // Don't force-upgrade in dev — it interferes with the http localhost HMR socket.
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// PWA: compile src/app/sw.ts → public/sw.js and auto-register it.
//
// @serwist/next runs as a webpack plugin, and Next 16 dev defaults to
// Turbopack — which rejects any webpack config. So we only *call* Serwist
// for production builds (run with `next build --webpack`, see package.json).
// Dev stays on clean Turbopack with no service worker, which is what you
// want while iterating anyway.
export default process.env.NODE_ENV === "production"
  ? withSerwistInit({
      swSrc: "src/app/sw.ts",
      swDest: "public/sw.js",
    })(nextConfig)
  : nextConfig;
