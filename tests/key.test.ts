// ============================================================
// Ward — Key Management Layer Tests
// ============================================================
// Tests for mnemonic generation, validation, HD derivation,
// and signing correctness.

import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  getMnemonicWords,
  normalizeMnemonic,
} from '@/layers/key';
import { deriveAccount, deriveAccounts } from '@/layers/key/derive';

// ---- Mnemonic Tests ----

describe('Mnemonic generation', () => {
  it('generates a 12-word mnemonic', () => {
    const mnemonic = generateMnemonic();
    const words = mnemonic.split(' ');
    expect(words).toHaveLength(12);
  });

  it('generates valid BIP-39 mnemonics', () => {
    // Generate 10 mnemonics and validate each
    for (let i = 0; i < 10; i++) {
      const mnemonic = generateMnemonic();
      expect(validateMnemonic(mnemonic)).toBe(true);
    }
  });

  it('produces unique mnemonics', () => {
    const mnemonics = new Set<string>();
    for (let i = 0; i < 20; i++) {
      mnemonics.add(generateMnemonic());
    }
    // With 128 bits of entropy, 20 generations should all be unique
    expect(mnemonics.size).toBe(20);
  });

  it('returns all lowercase words', () => {
    const mnemonic = generateMnemonic();
    expect(mnemonic).toBe(mnemonic.toLowerCase());
  });
});

describe('Mnemonic validation', () => {
  it('validates a known good mnemonic', () => {
    // Standard test vectors from BIP-39 spec
    const valid = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    expect(validateMnemonic(valid)).toBe(true);
  });

  it('rejects invalid mnemonics', () => {
    expect(validateMnemonic('not a real mnemonic phrase at all')).toBe(false);
    expect(validateMnemonic('')).toBe(false);
    expect(validateMnemonic('word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12')).toBe(false);
  });

  it('rejects 11-word phrases', () => {
    const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
    expect(validateMnemonic(words)).toBe(false);
  });

  it('accepts valid mnemonics with extra whitespace', () => {
    // Extra spaces around words — normalizeMnemonic handles this
    const valid = '  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    expect(validateMnemonic(valid)).toBe(true);
  });

  it('rejects mnemonics with one wrong word', () => {
    // Valid mnemonic with last word changed
    const invalid = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon zoo';
    expect(validateMnemonic(invalid)).toBe(false);
  });
});

describe('Mnemonic normalization', () => {
  it('normalizes whitespace', () => {
    const phrase = '  word1   word2  word3 ';
    expect(normalizeMnemonic(phrase)).toBe('word1 word2 word3');
  });

  it('lowercases', () => {
    expect(normalizeMnemonic('WORD1 Word2 word3')).toBe('word1 word2 word3');
  });
});

describe('getMnemonicWords', () => {
  it('returns array of words', () => {
    const words = getMnemonicWords('one two three four five six seven eight nine ten eleven twelve');
    expect(words).toHaveLength(12);
    expect(words[0]).toBe('one');
    expect(words[11]).toBe('twelve');
  });
});

// ---- HD Derivation Tests ----

describe('mnemonicToSeed', () => {
  it('produces a 64-byte seed from a valid mnemonic', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = mnemonicToSeed(mnemonic);
    expect(seed).toBeInstanceOf(Uint8Array);
    expect(seed.length).toBe(64); // BIP-39 seed is 512 bits = 64 bytes
  });

  it('throws on invalid mnemonic', () => {
    expect(() => mnemonicToSeed('invalid mnemonic')).toThrow();
  });
});

describe('HD derivation', () => {
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  it('derives a valid Ethereum address from index 0', () => {
    const seed = mnemonicToSeed(testMnemonic);
    const account = deriveAccount(seed, 0);
    // Should be a valid 0x-prefixed 42-character address
    expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('derives different addresses for different indices', () => {
    const seed = mnemonicToSeed(testMnemonic);
    const account0 = deriveAccount(seed, 0);
    const account1 = deriveAccount(seed, 1);
    const account2 = deriveAccount(seed, 2);

    expect(account0.address).not.toBe(account1.address);
    expect(account1.address).not.toBe(account2.address);
    expect(account0.address).not.toBe(account2.address);
  });

  it('derives deterministic addresses (same seed + index = same address)', () => {
    const seed = mnemonicToSeed(testMnemonic);
    const first = deriveAccount(seed, 5).address;
    const second = deriveAccount(seed, 5).address;
    expect(first).toBe(second);
  });

  it('derives multiple accounts', () => {
    const seed = mnemonicToSeed(testMnemonic);
    const accounts = deriveAccounts(seed, 5);
    expect(accounts).toHaveLength(5);
    accounts.forEach((account, i) => {
      expect(account.index).toBe(i);
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(account.path).toContain(String(i));
      expect(account.name).toContain(String(i + 1));
    });
  });
});
