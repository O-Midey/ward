// ============================================================
// Ward — Crypto Layer: Encryption
// ============================================================
// Encrypts and decrypts the wallet seed using AES-256-GCM.

const ALGORITHM = 'AES-GCM';

type Bytes = Uint8Array;

export async function encrypt(
  key: CryptoKey,
  plaintext: Bytes,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    (plaintext as unknown as Uint8Array<ArrayBuffer>).buffer as ArrayBuffer,
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
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    data.buffer as ArrayBuffer,
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
