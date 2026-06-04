# Ward — Security Model

Ward is a non-custodial Ethereum wallet designed as a portfolio project for Sepolia testnet. This document defines the threat model, what is protected, what is not, and the explicit tradeoffs made at each decision point. It is written to demonstrate security literacy, not to claim production readiness.

## Threat Model

### What we protect against

| Threat | Protection |
|--------|-----------|
| **Disk access to keys** | The mnemonic is encrypted with AES-256-GCM before storage. The key is derived from the user's password via PBKDF2 (600,000 iterations). Only ciphertext is written to IndexedDB. An attacker with filesystem access sees only encrypted blobs. |
| **Key extraction from memory after lock** | On lock (manual, auto-lock timeout, or tab visibility change), all keys are wiped from the Zustand store and garbage-collected. The mnemonic string and derived account objects are replaced with null. |
| **Unauthorized unlock** | The password gate requires correct PBKDF2 derivation + AES-GCM decryption. GCM authentication failure (wrong password) always throws — there are no timing side-channels in the Web Crypto API's GCM implementation. |
| **Phishing via transaction blindness** | The confirmation sheet decodes calldata before signing and displays: the function being called, the recipient, the amount, and estimated gas. ERC-20 approvals are flagged explicitly; unlimited allowances get a prominent warning. Contract interactions that can't be decoded get an explicit "unknown" warning. |
| **Unlimited ERC-20 approvals** | The calldata decoder detects `approve(address,uint256)` calls and checks the allowance amount against `MAX_UINT256`. Unlimited approvals get a warning banner with an explanation of the risk. |
| **In-browser XSS / injection** | No `dangerouslySetInnerHTML`. No `eval`. Framework-level XSS protection from React. Content Security Policy headers can be added at the Next.js config level. |
| **Analytics leakage** | There is no analytics, no error tracking, no third-party scripts. No addresses or transaction data leave the browser except through the intended chain/indexer RPC calls. |
| **Installation integrity** | As a PWA installed from a trusted origin, subsequent launches use the installed service worker and cached assets. No auto-updating without user navigation to the origin. |

### What we do NOT protect against (and why)

| Threat | Status | Rationale |
|--------|--------|-----------|
| **Compromised browser / extension** | Not protected | A malicious browser extension can read the DOM, intercept `crypto.subtle` calls, or keylog the password. This is inherent to any web wallet. Production would require hardware-wallet support or a browser-extension architecture with isolated execution contexts. |
| **Memory dumping / cold-boot attacks** | Not protected | Keys are held as plain JavaScript strings in the Zustand store while unlocked. A process memory dump could recover them. Production would use non-extractable CryptoKey handles for signing (Web Crypto `extractable: false`) or move signing to a secure enclave. |
| **Supply chain attacks on npm dependencies** | Partially protected | We use audited libraries (@scure/bip39, @scure/bip32, viem) from reputable maintainers. However, we do not pin hashes or use Subresource Integrity. Production would use lockfile-aware CI, dependency review, and SRI. |
| **Phishing sites impersonating Ward** | Not protected | As a web app, Ward is subject to domain spoofing. Production would need ENS/IPFS hosting with content hashing, or distribution as a browser extension with a verified identity. |
| **Physical device access while unlocked** | Not protected | If an attacker has physical access to an unlocked device, they can access the wallet. A configurable idle auto-lock (1–30 min, default 5) plus a ~30s grace lock once the tab is hidden reduces this window but does not eliminate it. Production would add biometric re-authentication (WebAuthn) for sensitive operations. |
| **Network eavesdropping on RPC calls** | Mitigated, not eliminated | RPC calls to Alchemy go over HTTPS. However, the node operator (Alchemy) can see which addresses are being queried and which transactions are being broadcast. This is inherent to the Ethereum client-server model. Production would add a private RPC endpoint or light-client verification. |
| **RPC node manipulation** | Not protected | A compromised or malicious RPC node could return incorrect balances, inflate gas estimates, or front-run transactions. Production would verify responses against multiple nodes or use a light client. |
| **Key generation weakness** | Low risk | We use `@scure/bip39` which internally uses `crypto.getRandomValues()` — the cryptographically secure PRNG of the browser. The entropy source is as strong as the browser's implementation. |
| **PBKDF2 vs Argon2/scrypt** | Deliberate tradeoff | PBKDF2 is not memory-hard. A GPU-accelerated brute-force attack on the password is feasible if the encrypted vault is exfiltrated. We chose PBKDF2 because Web Crypto API provides it natively (no additional dependency), and we use a high iteration count (600,000) to increase cost. Production would use Argon2id via a WASM implementation. |
| **Side-channel attacks** | Not assessed | The Web Crypto API's implementations are browser-dependent. We rely on the browser vendor to provide constant-time AES-GCM and PBKDF2. No independent assessment has been performed. |

## Design Decisions & Tradeoffs

### Why AES-256-GCM?

AES-GCM provides both confidentiality and integrity (authenticated encryption). Tampering with the ciphertext causes decryption to fail — an attacker cannot modify the stored vault without detection. We chose GCM over CBC because GCM is the modern standard, available in Web Crypto API, and provides authentication without a separate HMAC.

Tradeoff: GCM's 12-byte IV must never be reused with the same key. We generate a fresh random IV per encryption, which is safe.

### Why PBKDF2 and not Argon2?

PBKDF2 is available natively in `crypto.subtle.deriveKey()` — zero additional dependencies, zero WASM bloat, works in every modern browser. Argon2id is memory-hard and would significantly slow GPU-based attacks, but requires a WASM implementation that adds complexity, bundle size, and a new trust dependency.

For a testnet portfolio project, PBKDF2 at 600,000 iterations is the right tradeoff. For a production wallet holding real value, Argon2id would be mandatory.

### Why password-based encryption (and not WebAuthn)?

Password-based encryption is universal — it works on every device, requires no hardware, and the user can recover their wallet on a new device with just the password and seed phrase. WebAuthn (biometric unlock) would be more convenient and resistant to keyloggers, but adds platform dependency and recovery complexity.

For production: WebAuthn for unlock convenience, with the password as a recovery fallback.

### Why keys in JavaScript strings and not CryptoKey handles?

`crypto.subtle` CryptoKey objects marked `extractable: false` cannot be read back as bytes — they can only be used for signing. This would prevent memory exfiltration of the private key. However, they cannot be used with viem's `LocalAccount` which requires the raw private key for signing.

Production approaches:
1. Implement signing entirely through Web Crypto (ECDSA with the P-256 / secp256k1 curve if available).
2. Use a WebAssembly secp256k1 implementation that operates on non-extractable key handles.
3. Use a secure enclave (Trusted Execution Environment) or hardware wallet.

For this project, we accept the memory exposure as a known tradeoff and mitigate with aggressive auto-locking.

### Why IndexedDB and not sessionStorage?

SessionStorage is cleared when the tab closes, which is too aggressive — the user would need to re-enter their password on every page refresh. IndexedDB persists across sessions while keeping data origin-scoped. Combined with encryption, it provides the right balance of persistence and security.

### Why no WalletConnect / dApp connector?

WalletConnect introduces a large attack surface: the user's wallet can be prompted to sign arbitrary transactions from any website. Implementing it securely requires connection lifecycle management, session scoping, per-dApp permissions, and transaction simulation — all of which are significant engineering effort and out of scope for this portfolio project.

## Key Management Lifecycle

```
Create/Import
  │
  ▼
Mnemonic generated/validated ──► Encrypted with AES-GCM ──► Stored in IndexedDB
                                    (ciphertext only)
  │
  ▼
Derive HD accounts in memory ──► Wallet is UNLOCKED
                                    (keys in Zustand store)
  │
  ├── Lock (manual or auto-lock)
  │     │
  │     ▼
  │   Keys wiped from Zustand ──► Wallet is LOCKED
  │                                  (only ciphertext on disk)
  │
  └── Unlock (password)
        │
        ▼
      PBKDF2 derive key ──► AES-GCM decrypt ──► Validate mnemonic
                                                      │
                                                      ▼
                                              Keys back in memory
```

## Recommendations for Production

If Ward were to be deployed as a production wallet on mainnet, the following changes would be required:

1. **Argon2id** replace PBKDF2 for memory-hard key derivation
2. **WebAuthn / biometric unlock** with password as recovery fallback
3. **Non-extractable signing keys** via Web Crypto or WASM secp256k1
4. **Hardware wallet support** (Ledger, Trezor) via WebHID / WebUSB
5. **Transaction simulation** before signing (e.g., Tenderly)
6. **Anti-phishing** — address allowlists, domain verification
7. **Dependency pinning** with SRI hashes and lockfile review in CI
8. **Content Security Policy** headers with strict `script-src`
9. **Multi-party computation (MPC)** or social recovery for seed backup
10. **Formal audit** by a reputable security firm
11. **Bug bounty program** with clear scope and safe harbor
12. **Rate limiting** and anomaly detection on RPC calls
