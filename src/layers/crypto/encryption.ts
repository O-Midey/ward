// ============================================================
// Ward — Crypto Layer: Encryption
// ============================================================
// Encrypts and decrypts the wallet seed using AES-256-GCM.

const ALGORITHM = 'AES-GCM';

// Pin the backing buffer to ArrayBuffer (not the wider ArrayBufferLike, which
// includes SharedArrayBuffer) so these values are assignable to WebCrypto's
// BufferSource parameters under TypeScript 5.7+.
type Bytes = Uint8Array<ArrayBuffer>;

export async function encrypt(
  key: CryptoKey,
  plaintext: Bytes,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // Pass typed-array views directly (see keyderivation.ts) — extracting `.buffer`
  // breaks WebCrypto's realm-sensitive ArrayBuffer check on Node 20 under jsdom.
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    plaintext,
  );

  return {
    ciphertext: bufferToBase64(new Uint8Array(encrypted as ArrayBuffer)),
    iv: bufferToBase64(iv),
  };
}

export async function decrypt(
  key: CryptoKey,
  ciphertext: string,
  ivBase64: string,
): Promise<Bytes> {
  const iv = base64ToBuffer(ivBase64);
  const data = base64ToBuffer(ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data,
  );

  return new Uint8Array(decrypted as ArrayBuffer);
}

export function stringToBytes(str: string): Bytes {
  return new TextEncoder().encode(str);
}

export function bytesToString(bytes: Bytes): string {
  return new TextDecoder().decode(bytes);
}

function bufferToBase64(buf: Bytes): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Bytes {
  const binary = atob(base64);
  const len = binary.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf;
}
