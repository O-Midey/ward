# Ward

**A non-custodial Ethereum wallet built as a Progressive Web App — keys encrypted locally, signing fully on-device.**

Ward is a portfolio project demonstrating engineering judgment, clean architecture, security literacy, and UI craft. It runs in the browser as a Progressive Web App but is designed to feel like a polished native mobile wallet. The name leans into its meaning — protection, guarding, the ward of a lock that a key fits.

> ⚠️ **Testnet only.** Ward operates exclusively on Sepolia and selected EVM testnets. It is not audited for production use and should never hold real funds. This is stated in the UI, the README, and every screen that matters.

## Architecture

Ward enforces strict layering — each layer only talks to the one directly below through typed interfaces. The UI layer never touches key material.

```
┌──────────────────────────────────────────────────────────┐
│  UI Layer (components/, hooks/)                          │
│  Presentational components & screens                     │
│  State: Zustand stores + TanStack Query                  │
│  Never accesses keys directly                            │
├──────────────────────────────────────────────────────────┤
│  Service Layer (layers/services/)                        │
│  Alchemy indexer, token/NFT metadata, calldata decoding  │
├──────────────────────────────────────────────────────────┤
│  Chain Layer (layers/chain/)                             │
│  viem clients, balances, gas, tx building & broadcast    │
├──────────────────────────────────────────────────────────┤
│  Key Management Layer (layers/key/)                      │
│  BIP-39 mnemonics, BIP-32/44 HD derivation, signing      │
│  Private keys live here — in memory only while unlocked  │
├──────────────────────────────────────────────────────────┤
│  Crypto / Storage Layer (layers/crypto/)                 │
│  AES-256-GCM encryption, PBKDF2 derivation, IndexedDB    │
│  Only ciphertext touches disk                            │
└──────────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical detail.

## Features

- **Wallet creation & import** — generate a BIP-39 mnemonic or import an existing one. Guided onboarding with seed-phrase backup and verification (confirm words back before proceeding).
- **HD multi-account** — derive multiple accounts from one seed (BIP-44 path `m/44'/60'/0'/0/x`). Add and switch between accounts.
- **Encrypted local storage** — the mnemonic is encrypted with AES-256-GCM (key derived via PBKDF2, 600,000 iterations). Only ciphertext is stored in IndexedDB. Keys live in memory only while the wallet is unlocked.
- **Password unlock + auto-lock** — password gate on open. Auto-locks after 5 minutes of inactivity or when the tab loses focus. Keys are wiped from memory on lock.
- **Send ETH** — enter recipient + amount, estimate gas, review in the confirmation sheet, sign, broadcast. Full pending/confirmed status feedback.
- **Transaction confirmation flow** — the flagship security feature. Before signing, Ward decodes and displays: recipient, amount, function being called (decoded calldata), estimated gas, and target chain. Approvals get special treatment.
- **Approval awareness** — detects ERC-20 `approve` calls, flags unlimited allowances prominently, and shows the spender address so you know what you're authorizing.
- **Multi-chain** — Ethereum Sepolia plus Base Sepolia, OP Sepolia, Arbitrum Sepolia, and Polygon Amoy. Per-chain balances. Clean state handling on network switch.
- **Token + NFT portfolio** — fetches ERC-20 balances and NFTs via Alchemy. Token logos and metadata. NFTs with graceful fallbacks for broken/IPFS media.
- **EIP-712 typed-data signing** — sign structured data with a human-readable display of the message contents.
- **Light & dark themes** — both independently designed (not auto-inverted). System-preference detection on first load. Smooth animated theme switch.
- **PWA** — installable, standalone display, themed status bar, responsive shell.

## Screens

| Onboarding | Home | Send | Receive | Settings |
|-----------|------|------|---------|----------|
| Create / Import → Backup → Verify | Portfolio: balances, tokens, NFTs | Recipient + amount → Review → Confirm | Address + QR code | Theme, network, seed, lock, reset |

Plus: Transaction Confirmation Sheet (bottom sheet with full calldata decode), EIP-712 Signing Sheet.

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Chain | viem (public clients, account utilities, transaction building) |
| Wallet mechanics | @scure/bip39, @scure/bip32 |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| Storage | IndexedDB via `idb` |
| State | Zustand + TanStack Query |
| Styling | TailwindCSS with CSS custom properties (design tokens) |
| Animation | Framer Motion (spring-based, interruptible) |
| PWA | @serwist/next |
| Indexer | Alchemy |
| Testing | Vitest + fake-indexeddb |

🔗 **Live demo:** [ward-zeta.vercel.app](https://ward-zeta.vercel.app)

## Setup

```bash
# Clone and install
cd ward
npm install

# Create environment file
cp .env.local .env.local  # already templated

# Add your Alchemy API key to .env.local
# NEXT_PUBLIC_ALCHEMY_KEY=your_key_here

# Run development server
npm run dev
# → http://localhost:3000

# Run tests
npx vitest run

# Build for production
npm run build
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_ALCHEMY_KEY` | Yes | Alchemy API key for chain access and token/NFT indexing |

Get a free key at [dashboard.alchemy.com](https://dashboard.alchemy.com). The app falls back to public RPCs if no key is set, but token/NFT features will be unavailable.

## Testing

```bash
npx vitest run        # Run all tests
npx vitest            # Watch mode
```

Tests cover the key management layer (mnemonic generation, validation, HD derivation determinism) and the crypto/storage layer (encrypt/decrypt round-trips, wrong password rejection, IndexedDB CRUD, full pipeline integration). 36 tests, all passing.

## Security

See [SECURITY.md](./SECURITY.md) for the full threat model — what is protected, what is not, why each choice was made, and what would change for a production/mainnet wallet.

## Roadmap

These are explicitly out of scope for this project. They would be the next steps for a production wallet:

- Token swaps (DEX integration)
- Fiat on-ramp
- WalletConnect / dApp connector
- Price charts and market data
- Standalone transaction history feed
- Smart accounts (ERC-4337)
- MPC / social recovery
- Hardware wallet support
- Argon2id / scrypt for key derivation (over PBKDF2)
- WebAuthn for passwordless unlock
- Audited dependency pinning with SRI
- Secure enclave / Web Crypto non-extractable keys for signing
- Anti-phishing address lists
- Multi-language support

## License

MIT
