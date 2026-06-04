import { describe, it, expect } from 'vitest';
import { formatAmount, formatTokenBalance, shortAddress, timeAgo } from '@/lib/format';

describe('formatAmount', () => {
  it('handles zero and tiny values', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount('0.00000001')).toBe('<0.0001');
  });
  it('trims to sensible precision', () => {
    expect(formatAmount('0.123456')).toBe('0.1235');
    expect(formatAmount('12.3456')).toBe('12.35');
  });
});

describe('formatTokenBalance', () => {
  it('applies token decimals', () => {
    expect(formatTokenBalance('1000000', 6)).toBe('1.00'); // 1 USDC
    expect(formatTokenBalance((10n ** 18n).toString(), 18)).toBe('1.00');
  });
});

describe('shortAddress', () => {
  it('truncates the middle', () => {
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });
  it('leaves short strings intact', () => {
    expect(shortAddress('0x12')).toBe('0x12');
  });
});

describe('timeAgo', () => {
  it('reports recent timestamps', () => {
    expect(timeAgo(Date.now())).toBe('just now');
    expect(timeAgo(Date.now() - 5 * 60_000)).toBe('5m ago');
  });
});
