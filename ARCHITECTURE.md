# Ward — Architecture

## Overview

Ward is a non-custodial Ethereum (EVM) wallet delivered as a Progressive Web App. It runs entirely in the browser — no backend ever sees private keys or seed phrases. Everything key-related happens client-side.

**Testnet only (Sepolia).** Ward is a portfolio project demonstrating engineering judgment, clean architecture, security literacy, and UI craft. It is not intended for real funds.

## Layered Architecture

Each layer only communicates with the one directly beneath it through typed interfaces. The UI layer never touches key material directly.

```
┌──────────────────────────────────────────────────────────┐
│  UI Layer (components/, hooks/)                          │
│  Presentational components & screens                     │
│  State: Zustand stores + TanStack Query                  │
│  Never accesses keys directly                            │
├──────────────────────────────────────────────────────────┤
│  Service Layer (layers/services/)                        │
│  Indexer client (Alchemy), token/NFT metadata            │
│  Calldata decoding helpers, caching                      │
│  → exposes typed services to UI layer                    │
├──────────────────────────────────────────────────────────┤
│  Chain Layer (layers/chain/)                             │
│  viem clients per chain, balance/gas/nonce reads         │
│  Transaction building, signing handoff to key layer      │
│  Broadcast, receipt tracking                             │
│  → receives signed tx from key layer                     │
├──────────────────────────────────────────────────────────┤
│  Key Management Layer (layers/key/)                      │
│  BIP-39 mnemonic generation (@scure/bip39)               │
│  HD derivation BIP-32/BIP-44 (@scure/bip32)              │
│  Signing via viem account utilities                      │
│  Private keys NEVER stored in plaintext on disk          │
│  → keys live in memory only while unlocked               │
├──────────────────────────────────────────────────────────┤
│  Crypto / Storage Layer (layers/crypto/)                 │
│  AES-GCM encrypt/decrypt of seed material                │
│  PBKDF2 password-based key derivation                    │
│  IndexedDB persistence (only ciphertext)                 │
│  Auto-lock: wipe keys from memory on lock                │
│  → stores ciphertext; returns decrypted keys to key layer │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

### Wallet Creation
```
User → Onboarding UI → crypto.deriveKey(password) 
     → key.generateMnemonic() 
     → crypto.encrypt(mnemonic, derivedKey) 
     → IndexedDB (ciphertext only)
```

### Wallet Unlock
```
User → Unlock UI → crypto.deriveKey(password) 
     → crypto.decrypt(ciphertext, derivedKey) 
     → key.loadMnemonic(mnemonic) (in memory only)
     → Auto-lock timer starts
```

### Send Transaction

Orchestrated end-to-end by `hooks/useSendTransaction`:
```
User → Send UI → useSendTransaction.prepare()
     → services.decodeCalldata(tx)          (classify + flag approvals)
     → chain.estimateGas(tx)                (fee + max-total)
     → Confirmation Sheet (decode, fee breakdown, balance guard)
     → User confirms → useSendTransaction.confirm()
     → chain.buildTransaction(tx)
     → key.sign(tx)                          (keys derived in-memory at sign time)
     → chain.broadcast(signedTx)
     → activity.add(pending)                 (persisted to IndexedDB)
     → chain.waitForReceipt(hash)
          → activity.updateStatus(confirmed|failed)
          → invalidate balance/token queries (TanStack Query)
```

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| Chain interaction | viem |
| HD wallet | @scure/bip39, @scure/bip32 |
| Encryption | Web Crypto API (AES-GCM) |
| KDF | Web Crypto API (PBKDF2) |
| Storage | IndexedDB via `idb` |
| State | Zustand + TanStack Query |
| Styling | TailwindCSS |
| Animation | Framer Motion |
| PWA | @serwist/next |
| Indexer | Alchemy SDK |
| Testing | Vitest + Testing Library |

## Folder Structure

```
src/
├── layers/
│   ├── key/          # Key management — mnemonic, HD derive, sign
│   │   ├── index.ts       # Public API
│   │   ├── mnemonic.ts    # Generate, validate, import mnemonic
│   │   ├── derive.ts      # BIP-32 / BIP-44 HD derivation
│   │   └── sign.ts        # Transaction & EIP-712 signing
│   ├── crypto/       # Encryption & storage — AES-GCM, PBKDF2, IndexedDB
│   │   ├── index.ts       # Public API
│   │   ├── encryption.ts  # Encrypt/decrypt with AES-GCM
│   │   ├── keyderivation.ts # PBKDF2 key derivation
│   │   └── storage.ts     # Encrypted vault persistence (idb)
│   ├── chain/        # Chain interaction — viem clients, balances, tx
│   │   ├── index.ts       # Public API
│   │   ├── client.ts      # Cached PublicClient factory
│   │   ├── balance.ts     # Balance / nonce reads
│   │   └── tx.ts          # Gas estimate, build, broadcast, receipts
│   └── services/     # Indexer, metadata, calldata decoding
│       ├── index.ts
│       ├── alchemy.ts     # Alchemy JSON-RPC / NFT wrapper
│       ├── tokens.ts      # Token balances & metadata
│       ├── nfts.ts        # NFT fetching
│       └── decode.ts      # Calldata decoding (approval/transfer flags)
├── lib/              # Shared types & utilities
│   ├── types.ts          # Domain types + SUPPORTED_CHAINS config
│   ├── format.ts         # Number / address / time formatters
│   ├── password.ts       # Password-strength heuristic
│   ├── clipboard.ts      # Copy with ephemeral auto-clear
│   └── activity-db.ts    # Local transaction-history persistence (idb)
├── store/            # Zustand stores
│   ├── wallet.ts         # Lock state, accounts, active chain, settings
│   └── activity.ts       # Reactive, persisted transaction history
├── hooks/            # React hooks
│   ├── useSendTransaction.ts  # Full send lifecycle + receipt tracking
│   └── useAutoLock.ts         # Idle + visibility auto-lock
├── components/
│   ├── ui/           # Design-system primitives
│   │   ├── Icon.tsx       # Single tree-shaken icon set
│   │   ├── Button.tsx · IconButton.tsx · Card.tsx
│   │   ├── Field.tsx · PasswordField.tsx
│   │   ├── Sheet.tsx      # Reusable bottom sheet
│   │   └── index.ts       # Barrel
│   └── screens/      # Full-screen flows
│       ├── IntroScreen.tsx · OnboardingScreen.tsx · UnlockScreen.tsx
│       ├── HomeScreen.tsx · SendScreen.tsx · ReceiveScreen.tsx
│       ├── SettingsScreen.tsx
│       └── ConfirmSheet.tsx · SignTypedDataSheet.tsx
├── providers/        # React providers
│   ├── AppProviders.tsx
│   ├── ThemeProvider.tsx
│   └── QueryProvider.tsx
└── app/              # Next.js App Router
    ├── layout.tsx
    ├── page.tsx          # App shell — routing + sheet orchestration
    └── globals.css       # Tailwind v4 + design tokens
```

> The PWA manifest lives at `public/manifest.json`. Chain configs live in
> `lib/types.ts` (`SUPPORTED_CHAINS`). Theme and active-screen state are kept
> in `ThemeProvider` and the shell's local state rather than a separate store.

## Design System

Tailwind v4 is configured entirely in CSS via the `@theme` block in
`app/globals.css` — there is no `tailwind.config.ts`. Visual properties resolve
to CSS custom properties that swap between `:root` (light) and `.dark`. Screens
consume the design system through the primitives in `components/ui/` rather than
hardcoded values.

- **Colors** (`@theme` → utilities like `bg-surface`, `text-text-secondary`,
  `text-accent`): `--c-bg`, `--c-surface`, `--c-surface-2`, `--c-text`,
  `--c-text-secondary`, `--c-text-tertiary`, `--c-accent`, `--c-accent-bright`,
  `--c-accent-soft`, `--c-on-accent`, `--c-border`, and `success`/`warning`/
  `danger` (each with a `-subtle` tint).
- **Radius**: `--radius-sm | md | lg | xl`.
- **Typography**: `--font-display` (Playfair Display), `--font-body`
  (Source Sans 3), `--font-mono` (JetBrains Mono).
- **Elevation**: `--shadow-sm | md | lg | accent`.
- **Gradients**: `--grad-hero` (balance card / medallions), `--grad-accent`
  (primary buttons).
- **Motion**: `--ease-out`, `--ease-in-out`; a global `:focus-visible` ring and
  a `prefers-reduced-motion` guard.
- **Primitives**: `Button`, `IconButton`, `Icon`, `Card`, `Field`,
  `PasswordField`, `Sheet`.

## Security

See [SECURITY.md](./SECURITY.md) for the full threat model, protected surfaces, and explicit tradeoffs.

## Testnet Disclaimer

Ward operates on Sepolia testnet only. It is a portfolio project — not audited for production use with real funds. Mainnet is explicitly out of scope.
