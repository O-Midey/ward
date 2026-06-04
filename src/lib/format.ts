// ============================================================
// Ward — Formatting helpers
// ============================================================
// Shared number/address/time formatting so screens render
// values identically everywhere.

/** Compact, human balance from a decimal string (e.g. "1.2345"). */
export function formatAmount(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(num) || num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Format a raw token balance (base units) given its decimals. */
export function formatTokenBalance(raw: string, decimals: number): string {
  return formatAmount(Number(raw) / 10 ** decimals);
}

/** Format a wei bigint as a trimmed ETH string. */
export function formatGwei(wei: bigint): string {
  const gwei = Number(wei) / 1e9;
  if (gwei < 0.01) return '<0.01';
  return gwei.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** 0x1234…abcd */
export function shortAddress(addr: string, lead = 6, tail = 4): string {
  if (addr.length <= lead + tail) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

/** Relative time like "2m ago", "just now". */
export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
