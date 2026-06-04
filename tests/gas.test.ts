import { describe, it, expect } from 'vitest';
import { applyGasSpeed } from '@/layers/chain/tx';

describe('applyGasSpeed', () => {
  const base = 1_000_000_000n; // 1 gwei

  it('scales fees per speed tier', () => {
    expect(applyGasSpeed(base, 'slow')).toBe(900_000_000n);
    expect(applyGasSpeed(base, 'normal')).toBe(1_100_000_000n);
    expect(applyGasSpeed(base, 'fast')).toBe(1_500_000_000n);
  });

  it('keeps fast > normal > slow', () => {
    expect(applyGasSpeed(base, 'fast')).toBeGreaterThan(applyGasSpeed(base, 'normal'));
    expect(applyGasSpeed(base, 'normal')).toBeGreaterThan(applyGasSpeed(base, 'slow'));
  });
});
