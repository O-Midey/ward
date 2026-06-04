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
  const pwBytes = encoder.encode(password);
  const pwBuf = toArrayBuffer(pwBytes);
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    pwBuf,
    'PBKDF2', false, ['deriveKey'],
  );
  const saltBytes = base64ToBuffer(saltBase64);
  const saltBuf = toArrayBuffer(saltBytes);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuf, iterations: ITERATIONS, hash: HASH },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

function bufferToBase64(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}
