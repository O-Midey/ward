// ============================================================
// Ward — Crypto Layer: Key Derivation
// ============================================================

const ITERATIONS = 600_000;
const KEY_LENGTH = 256;
const HASH = 'SHA-256';

export function generateSalt(): string {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  return bufferToBase64(salt);
}

export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  // Pass typed-array views directly to WebCrypto. Don't extract `.buffer`: a raw
  // ArrayBuffer is validated via a realm-sensitive instanceof check that fails on
  // Node 20 when the data is created in another realm (e.g. jsdom under Vitest).
  // Views are validated with ArrayBuffer.isView(), which is realm-agnostic.
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2', false, ['deriveKey'],
  );
  const salt = base64ToBuffer(saltBase64);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

function bufferToBase64(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}
