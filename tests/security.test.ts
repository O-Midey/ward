import { describe, it, expect, beforeEach } from 'vitest';
import { scorePassword } from '@/lib/password';
import { lockedForMs, recordFailure, resetLockout } from '@/lib/lockout';
import { addRecent, getRecents } from '@/lib/recents';
import { isEnsName } from '@/lib/ens';

beforeEach(() => localStorage.clear());

describe('scorePassword', () => {
  it('rates weak vs strong', () => {
    expect(scorePassword('').score).toBe(0);
    expect(scorePassword('password').score).toBe(1);
    expect(scorePassword('Tr0ub4dour&3xtra').score).toBeGreaterThanOrEqual(3);
  });
});

describe('unlock lockout', () => {
  it('stays unlocked for the first few failures, then escalates', () => {
    expect(lockedForMs()).toBe(0);
    for (let i = 0; i < 4; i++) recordFailure();
    expect(lockedForMs()).toBe(0); // 4 fails, still free
    const remaining = recordFailure(); // 5th → cooldown begins
    expect(remaining).toBeGreaterThan(0);
    expect(lockedForMs()).toBeGreaterThan(0);
  });

  it('clears on reset', () => {
    for (let i = 0; i < 6; i++) recordFailure();
    expect(lockedForMs()).toBeGreaterThan(0);
    resetLockout();
    expect(lockedForMs()).toBe(0);
  });
});

describe('recent recipients', () => {
  it('dedupes and caps the list', () => {
    for (let i = 0; i < 10; i++) addRecent(`0x${i.toString().padStart(40, '0')}`);
    addRecent('0x0000000000000000000000000000000000000001'); // dup of i=1
    const recents = getRecents();
    expect(recents.length).toBeLessThanOrEqual(6);
    expect(recents[0]).toBe('0x0000000000000000000000000000000000000001');
    expect(new Set(recents).size).toBe(recents.length);
  });
});

describe('isEnsName', () => {
  it('detects .eth names', () => {
    expect(isEnsName('vitalik.eth')).toBe(true);
    expect(isEnsName('0x1234')).toBe(false);
  });
});
