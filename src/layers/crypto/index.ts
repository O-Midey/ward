// ============================================================
// Ward — Crypto Layer: Public API
// ============================================================
// This is the ONLY public surface of the crypto/storage layer.

export { deriveKey, generateSalt } from './keyderivation';
export { encrypt, decrypt, stringToBytes, bytesToString } from './encryption';
export {
  storeEncryptedVault,
  getEncryptedVault,
  hasVault,
  deleteVault,
} from './storage';
