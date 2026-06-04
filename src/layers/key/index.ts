// ============================================================
// Ward — Key Management Layer: Public API
// ============================================================
// This is the ONLY public surface of the key layer.
// All key operations go through this module.

export { generateMnemonic, validateMnemonic, mnemonicToSeed, getMnemonicWords, normalizeMnemonic } from './mnemonic';
export { deriveAccount, deriveAccounts } from './derive';
export { signTransaction, signTypedData, signMessage } from './sign';
