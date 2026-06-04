import { describe, it, expect } from 'vitest';
import { encodeFunctionData, parseAbi, maxUint256 } from 'viem';
import { decodeCalldata } from '@/layers/services/decode';

const TOKEN = '0x1111111111111111111111111111111111111111' as const;
const SPENDER = '0x2222222222222222222222222222222222222222' as const;
const RECIPIENT = '0x3333333333333333333333333333333333333333' as const;

const erc20 = parseAbi([
  'function approve(address spender, uint256 amount)',
  'function transfer(address to, uint256 amount)',
]);

describe('decodeCalldata', () => {
  it('treats empty calldata as a native transfer', () => {
    expect(decodeCalldata('0x', RECIPIENT).type).toBe('eth_transfer');
    expect(decodeCalldata(undefined, RECIPIENT).type).toBe('eth_transfer');
  });

  it('flags unlimited ERC-20 approvals', () => {
    const data = encodeFunctionData({ abi: erc20, functionName: 'approve', args: [SPENDER, maxUint256] });
    const decoded = decodeCalldata(data, TOKEN);
    expect(decoded.type).toBe('erc20_approve');
    expect(decoded.spender?.toLowerCase()).toBe(SPENDER);
    expect(decoded.tokenAddress).toBe(TOKEN);
    expect(decoded.params?.isUnlimited).toBe(true);
  });

  it('does not flag a bounded approval as unlimited', () => {
    const data = encodeFunctionData({ abi: erc20, functionName: 'approve', args: [SPENDER, 1_000n] });
    const decoded = decodeCalldata(data, TOKEN);
    expect(decoded.type).toBe('erc20_approve');
    expect(decoded.params?.isUnlimited).toBe(false);
  });

  it('decodes an ERC-20 transfer', () => {
    const data = encodeFunctionData({ abi: erc20, functionName: 'transfer', args: [RECIPIENT, 42n] });
    const decoded = decodeCalldata(data, TOKEN);
    expect(decoded.type).toBe('erc20_transfer');
    expect(decoded.functionName).toBe('transfer');
  });

  it('marks unrecognized selectors as unknown', () => {
    const decoded = decodeCalldata('0xdeadbeef', TOKEN);
    expect(decoded.type).toBe('unknown');
  });
});
