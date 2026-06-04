// ============================================================
// Ward — Service Layer: Calldata Decoding
// ============================================================
// Decodes transaction calldata to identify the type of interaction.
// Flags ERC-20 approvals (especially unlimited ones) and known patterns.

import type { DecodedCall } from '@/lib/types';
import { decodeFunctionData, parseAbi, getAddress } from 'viem';

// Known 4-byte selectors for common operations
const SELECTORS: Record<string, { name: string; type: DecodedCall['type']; abi: string }> = {
  '0xa9059cbb': { name: 'transfer', type: 'erc20_transfer', abi: 'function transfer(address to, uint256 amount)' },
  '0x095ea7b3': { name: 'approve', type: 'erc20_approve', abi: 'function approve(address spender, uint256 amount)' },
  '0x23b872dd': { name: 'transferFrom', type: 'erc20_transfer', abi: 'function transferFrom(address from, address to, uint256 amount)' },
  '0x42842e0e': { name: 'safeTransferFrom', type: 'contract_call', abi: 'function safeTransferFrom(address from, address to, uint256 tokenId)' },
};

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

/**
 * Decode transaction calldata into a human-readable description.
 * Only call this when data is present and non-empty.
 */
export function decodeCalldata(data: `0x${string}` | undefined, to: `0x${string}`): DecodedCall {
  if (!data || data === '0x') {
    return { type: 'eth_transfer' };
  }

  const selector = data.slice(0, 10).toLowerCase() as `0x${string}`;
  const known = SELECTORS[selector];

  if (known) {
    try {
      const abi = parseAbi([known.abi]);
      const decoded = decodeFunctionData({ abi, data });

      if (known.type === 'erc20_approve') {
        const args = decoded.args as unknown as [string, bigint];
        return {
          type: 'erc20_approve',
          functionName: 'approve',
          spender: args[0],
          tokenAddress: to,
          allowance: args[1].toString(),
          params: {
            spender: getAddress(args[0]),
            amount: formatAmount(args[1]),
            isUnlimited: args[1] >= MAX_UINT256,
          },
        };
      }

      if (known.type === 'erc20_transfer') {
        const args = decoded.args as unknown as [string, bigint] | [string, string, bigint];
        return {
          type: 'erc20_transfer',
          functionName: known.name,
          params: {
            ...(args.length === 2
              ? { to: getAddress(args[0]), amount: formatAmount(args[1]) }
              : { from: getAddress(args[0]), to: getAddress(args[1]), amount: formatAmount(args[2]) }),
          },
        };
      }

      return {
        type: 'contract_call',
        functionName: known.name,
      };
    } catch {
      // Fall through to unknown
    }
  }

  return {
    type: 'unknown',
    functionName: `0x${selector.slice(2, 10)}`,
  };
}

function formatAmount(amount: bigint): string {
  if (amount >= MAX_UINT256) return 'Unlimited';
  if (amount === 0n) return '0';
  // Show raw wei value for simplicity
  if (amount > 10n ** 18n) {
    const eth = Number(amount) / 1e18;
    return `${eth.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }
  return amount.toString();
}
