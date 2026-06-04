// ============================================================
// Ward — Key Management Layer: Signing
// ============================================================
// Transaction and message signing. The key layer is the ONLY
// place private keys exist. They are held in memory within
// viem LocalAccount objects, never serialized to plaintext.

import type { LocalAccount } from 'viem/accounts';
import type { TypedDataDefinition } from 'viem';

/**
 * Sign a raw transaction using the account's private key.
 * The tx object must include: to, value, chainId, and optionally data.
 */
export async function signTransaction(
  account: LocalAccount,
  tx: {
    to: `0x${string}`;
    value: bigint;
    chainId: number;
    data?: `0x${string}`;
    nonce: number;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    gasLimit?: bigint;
  },
): Promise<`0x${string}`> {
  const signed = await account.signTransaction({
    to: tx.to,
    value: tx.value,
    chainId: tx.chainId,
    data: tx.data,
    nonce: tx.nonce,
    maxFeePerGas: tx.maxFeePerGas,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    gas: tx.gasLimit,
    type: 'eip1559',
  });

  // viem's signTransaction returns the serialized signed tx
  return signed;
}

/**
 * Sign an EIP-712 typed data message.
 * Decodes and signs structured data, returning the signature.
 */
export async function signTypedData(
  account: LocalAccount,
  typedData: TypedDataDefinition,
): Promise<`0x${string}`> {
  const signature = await account.signTypedData(typedData);
  return signature;
}

/**
 * Sign an arbitrary message (personal_sign).
 */
export async function signMessage(
  account: LocalAccount,
  message: string,
): Promise<`0x${string}`> {
  const signature = await account.signMessage({ message });
  return signature;
}
