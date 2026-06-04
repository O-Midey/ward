// ============================================================
// Ward — Unlock lockout
// ============================================================
// Throttles password guessing on the unlock screen. PBKDF2 makes
// each attempt slow, but an explicit lockout with escalating
// cooldown turns brute-forcing the vault into a non-starter.
// State is persisted so it survives reloads.

const KEY = 'ward-unlock-lockout';
const FREE_ATTEMPTS = 5; // failures allowed before cooldowns begin
const BASE_COOLDOWN_MS = 30_000; // first cooldown
const MAX_COOLDOWN_MS = 15 * 60_000; // cap

interface LockoutState {
  fails: number;
  lockedUntil: number; // epoch ms, 0 = not locked
}

function read(): LockoutState {
  if (typeof window === 'undefined') return { fails: 0, lockedUntil: 0 };
  try {
    return JSON.parse(localStorage.getItem(KEY) || '') as LockoutState;
  } catch {
    return { fails: 0, lockedUntil: 0 };
  }
}

function write(state: LockoutState): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
}

/** Milliseconds remaining on the current lockout, or 0 if unlocked. */
export function lockedForMs(): number {
  const { lockedUntil } = read();
  return Math.max(0, lockedUntil - Date.now());
}

/** Record a failed attempt and return the new remaining lockout (ms). */
export function recordFailure(): number {
  const state = read();
  const fails = state.fails + 1;
  let lockedUntil = 0;
  if (fails >= FREE_ATTEMPTS) {
    const cooldown = Math.min(BASE_COOLDOWN_MS * 2 ** (fails - FREE_ATTEMPTS), MAX_COOLDOWN_MS);
    lockedUntil = Date.now() + cooldown;
  }
  write({ fails, lockedUntil });
  return Math.max(0, lockedUntil - Date.now());
}

/** Clear all lockout state after a successful unlock. */
export function resetLockout(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}
