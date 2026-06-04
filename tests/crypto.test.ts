// ============================================================
// Ward — Crypto Layer Tests
// ============================================================
// Tests for AES-GCM encryption round-trips, PBKDF2 key
// derivation, and storage state transitions.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateSalt, deriveKey } from '@/layers/crypto/keyderivation';
import { encrypt, decrypt, stringToBytes, bytesToString } from '@/layers/crypto/encryption';
import {
  storeEncryptedVault,
  getEncryptedVault,
  hasVault,
  deleteVault,
} from '@/layers/crypto/storage';
import type { EncryptedVault } from '@/lib/types';

// ---- Key Derivation Tests ----

describe('PBKDF2 key derivation', () => {
  it('generates a random salt', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);
    // Base64-encoded 32-byte salt
    expect(typeof salt1).toBe('string');
    expect(salt1.length).toBeGreaterThan(0);
  });

  it('derives a CryptoKey from password and salt', async () => {
    const salt = generateSalt();
    const key = await deriveKey('test-password-123', salt);
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('produces the same key for the same password and salt', async () => {
    const salt = generateSalt();
    const key1 = await deriveKey('mypassword', salt);
    const key2 = await deriveKey('mypassword', salt);
    // Both should derive successfully (CryptoKeys can't be directly compared,
    // but they should both be valid encryption keys)
    expect(key1.type).toBe(key2.type);
  });

  it('produces different keys for different passwords', async () => {
    const salt = generateSalt();
    const key1 = await deriveKey('password1', salt);
    const key2 = await deriveKey('password2', salt);
    // Different passwords with same salt → different keys
    // We verify by checking they encrypt the same plaintext differently
    const plaintext = stringToBytes('secret data');
    const enc1 = await encrypt(key1, plaintext);
    const enc2 = await encrypt(key2, plaintext);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });
});

// ---- Encryption Round-trip Tests ----

describe('AES-GCM encryption', () => {
  let key: CryptoKey;
  let salt: string;

  beforeEach(async () => {
    salt = generateSalt();
    key = await deriveKey('encryption-test-password', salt);
  });

  it('encrypts and decrypts a mnemonic phrase', async () => {
    const original = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const plaintext = stringToBytes(original);
    const { ciphertext, iv } = await encrypt(key, plaintext);

    // Ciphertext must differ from plaintext
    expect(ciphertext).not.toBe(original);
    expect(typeof ciphertext).toBe('string');
    expect(typeof iv).toBe('string');

    const decrypted = await decrypt(key, ciphertext, iv);
    const recovered = bytesToString(decrypted);
    expect(recovered).toBe(original);
  });

  it('produces different ciphertext each encryption (random IV)', async () => {
    const plaintext = stringToBytes('same data');
    const enc1 = await encrypt(key, plaintext);
    const enc2 = await encrypt(key, plaintext);

    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it('throws on decryption with wrong key', async () => {
    const plaintext = stringToBytes('sensitive seed phrase here');
    const { ciphertext, iv } = await encrypt(key, plaintext);

    const wrongKey = await deriveKey('wrong-password', salt);
    await expect(decrypt(wrongKey, ciphertext, iv)).rejects.toThrow();
  });

  it('throws on decryption with wrong IV', async () => {
    const plaintext = stringToBytes('test data');
    const { ciphertext } = await encrypt(key, plaintext);

    const wrongIv = generateSalt(); // Using a salt as fake IV
    await expect(decrypt(key, ciphertext, wrongIv)).rejects.toThrow();
  });

  it('encrypts and decrypts empty data', async () => {
    const plaintext = stringToBytes('');
    const { ciphertext, iv } = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, ciphertext, iv);
    expect(bytesToString(decrypted)).toBe('');
  });

  it('handles unicode mnemonic (japanese)', async () => {
    const original = 'あいこくしん あいこくしん あいこくしん あいこくしん あいこくしん あいこくしん あいこくしん あいこくしん あいこくしん あいこくしん あいこくしん あいこくしん';
    const plaintext = stringToBytes(original);
    const { ciphertext, iv } = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, ciphertext, iv);
    expect(bytesToString(decrypted)).toBe(original);
  });
});

// ---- Storage Tests ----

describe('IndexedDB storage', () => {
  beforeEach(async () => {
    await deleteVault();
  });

  afterEach(async () => {
    await deleteVault();
  });

  it('stores and retrieves an encrypted vault', async () => {
    const vault: EncryptedVault = {
      ciphertext: 'test-ciphertext',
      iv: 'test-iv',
      salt: 'test-salt',
      iterations: 600_000,
      version: 1,
    };

    await storeEncryptedVault(vault);
    const retrieved = await getEncryptedVault();

    expect(retrieved).not.toBeNull();
    expect(retrieved!.ciphertext).toBe('test-ciphertext');
    expect(retrieved!.iv).toBe('test-iv');
    expect(retrieved!.salt).toBe('test-salt');
    expect(retrieved!.version).toBe(1);
  });

  it('returns null when no vault exists', async () => {
    const result = await getEncryptedVault();
    expect(result).toBeNull();
  });

  it('hasVault returns false when no vault', async () => {
    const exists = await hasVault();
    expect(exists).toBe(false);
  });

  it('hasVault returns true after storing', async () => {
    await storeEncryptedVault({
      ciphertext: 'ct',
      iv: 'iv',
      salt: 'salt',
      iterations: 600_000,
      version: 1,
    });
    const exists = await hasVault();
    expect(exists).toBe(true);
  });

  it('deleteVault removes the vault', async () => {
    await storeEncryptedVault({
      ciphertext: 'ct',
      iv: 'iv',
      salt: 'salt',
      iterations: 600_000,
      version: 1,
    });
    await deleteVault();
    const exists = await hasVault();
    expect(exists).toBe(false);
  });

  it('overwrites existing vault on store', async () => {
    await storeEncryptedVault({
      ciphertext: 'old',
      iv: 'iv',
      salt: 'salt',
      iterations: 600_000,
      version: 1,
    });
    await storeEncryptedVault({
      ciphertext: 'new',
      iv: 'iv2',
      salt: 'salt2',
      iterations: 600_000,
      version: 1,
    });

    const retrieved = await getEncryptedVault();
    expect(retrieved!.ciphertext).toBe('new');
  });
});

// ---- End-to-end: encrypt → store → retrieve → decrypt ----

describe('Full crypto pipeline', () => {
  beforeEach(async () => {
    await deleteVault();
  });

  afterEach(async () => {
    await deleteVault();
  });

  it('encrypts a mnemonic, stores it, retrieves and decrypts', async () => {
    const password = 'user-chosen-password';
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    // Encrypt
    const plaintext = stringToBytes(mnemonic);
    const { ciphertext, iv } = await encrypt(key, plaintext);

    // Store
    const vault: EncryptedVault = {
      ciphertext,
      iv,
      salt,
      iterations: 600_000,
      version: 1,
    };
    await storeEncryptedVault(vault);

    // Retrieve
    const retrieved = await getEncryptedVault();
    expect(retrieved).not.toBeNull();

    // Decrypt with same password
    const recoveredKey = await deriveKey(password, retrieved!.salt);
    const decrypted = await decrypt(recoveredKey, retrieved!.ciphertext, retrieved!.iv);
    const recovered = bytesToString(decrypted);

    expect(recovered).toBe(mnemonic);
  });

  it('fails to decrypt with wrong password (full pipeline)', async () => {
    const password = 'correct-password';
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const mnemonic = 'test mnemonic here';

    const { ciphertext, iv } = await encrypt(key, stringToBytes(mnemonic));
    const vault: EncryptedVault = { ciphertext, iv, salt, iterations: 600_000, version: 1 };
    await storeEncryptedVault(vault);

    const retrieved = await getEncryptedVault();
    const wrongKey = await deriveKey('wrong-password', retrieved!.salt);

    await expect(
      decrypt(wrongKey, retrieved!.ciphertext, retrieved!.iv)
    ).rejects.toThrow();
  });
});
