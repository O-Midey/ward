// ============================================================
// Ward — Recent recipients
// ============================================================
// A tiny local address book: the last few addresses you've sent
// to, surfaced in the Send flow. Stored on-device only.

const KEY = 'ward-recent-recipients';
const MAX = 6;

export function getRecents(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecent(address: string): void {
  if (typeof window === 'undefined') return;
  const addr = address.toLowerCase();
  const next = [addr, ...getRecents().filter((a) => a.toLowerCase() !== addr)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}
