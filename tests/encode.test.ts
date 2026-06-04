import { describe, it, expect } from 'vitest';
import { encodeErc20Transfer, encodeErc721Transfer } from '@/lib/encode';
import { decodeCalldata } from '@/layers/services/decode';

const TOKEN = '0x1111111111111111111111111111111111111111' as const;
const TO = '0x2222222222222222222222222222222222222222' as const;
const FROM = '0x3333333333333333333333333333333333333333' as const;

describe('encodeErc20Transfer', () => {
  it('produces transfer calldata the decoder understands', () => {
    const data = encodeErc20Transfer(TO, '1.5', 18);
    expect(data.startsWith('0xa9059cbb')).toBe(true);
    const decoded = decodeCalldata(data, TOKEN);
    expect(decoded.type).toBe('erc20_transfer');
    expect(decoded.functionName).toBe('transfer');
    expect(String(decoded.params?.to).toLowerCase()).toBe(TO);
  });

  it('applies decimals correctly (6-decimal token)', () => {
    // 1 USDC = 1_000_000 base units → selector + padded args
    const data = encodeErc20Transfer(TO, '1', 6);
    expect(data.endsWith((1_000_000).toString(16).padStart(64, '0'))).toBe(true);
  });
});

describe('encodeErc721Transfer', () => {
  it('produces safeTransferFrom calldata', () => {
    const data = encodeErc721Transfer(FROM, TO, '42');
    expect(data.startsWith('0x42842e0e')).toBe(true);
  });
});
