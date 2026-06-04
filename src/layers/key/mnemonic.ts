// ============================================================
// Ward — Key Management Layer: Mnemonic
// ============================================================
// Generates and validates BIP-39 mnemonics.
// Uses @scure/bip39 (auditable, minimal, no wasm).

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

/**
 * Generate a new 12-word BIP-39 mnemonic.
 * 128 bits of entropy → 12 words.
 */
export function generateMnemonic(): string {
  return bip39.generateMnemonic(wordlist, 128);
}

/**
 * Validate a mnemonic phrase.
 * Checks checksum and wordlist membership.
 */
export function validateMnemonic(phrase: string): boolean {
  const trimmed = phrase.trim().toLowerCase();
  return bip39.validateMnemonic(trimmed, wordlist);
}

/**
 * Convert a mnemonic phrase to its BIP-39 seed (entropy).
 * Returns Uint8Array — never a string representation.
 */
export function mnemonicToSeed(mnemonic: string): Uint8Array {
  const trimmed = mnemonic.trim().toLowerCase();
  if (!bip39.validateMnemonic(trimmed, wordlist)) {
    throw new Error('Invalid mnemonic');
  }
  return bip39.mnemonicToSeedSync(trimmed);
}

/**
 * Convert a mnemonic to entropy bytes.
 */
export function mnemonicToEntropy(mnemonic: string): Uint8Array {
  const trimmed = mnemonic.trim().toLowerCase();
  return bip39.mnemonicToEntropy(trimmed, wordlist);
}

/**
 * Normalize a mnemonic string for consistent comparison.
 */
export function normalizeMnemonic(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Get individual words from a mnemonic phrase.
 */
export function getMnemonicWords(phrase: string): string[] {
  return normalizeMnemonic(phrase).split(' ');
}
