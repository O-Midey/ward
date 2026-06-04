// ============================================================
// Ward — Calldata encoders
// ============================================================
// Builds the calldata for token / NFT transfers so the Send flow
// can move ERC-20s and ERC-721s, not just native value. The
// resulting tx is sent to the token contract with value 0, and
// the ConfirmSheet decodes it back for review.

import { encodeFunctionData, parseAbi, parseUnits } from 'viem';

const ERC20_ABI = parseAbi(['function transfer(address to, uint256 amount)']);
const ERC721_ABI = parseAbi(['function safeTransferFrom(address from, address to, uint256 tokenId)']);

/** Encode an ERC-20 `transfer(to, amount)` from a human amount + decimals. */
export function encodeErc20Transfer(to: `0x${string}`, amount: string, decimals: number): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, parseUnits(amount, decimals)],
  });
}

/** Encode an ERC-721 `safeTransferFrom(from, to, tokenId)`. */
export function encodeErc721Transfer(
  from: `0x${string}`,
  to: `0x${string}`,
  tokenId: string,
): `0x${string}` {
  return encodeFunctionData({
    abi: ERC721_ABI,
    functionName: 'safeTransferFrom',
    args: [from, to, BigInt(tokenId)],
  });
}
