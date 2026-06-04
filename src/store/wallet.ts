// ============================================================
// Ward — Zustand Store: Wallet
// ============================================================
// Central wallet state: locked/unlocked, accounts, active account.
// This store coordinates the key, crypto, and chain layers.

import { create } from 'zustand';
import type { WardAccount, EncryptedVault, WardChain } from '@/lib/types';
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveAccount,
  deriveAccounts,
} from '@/layers/key';
import { getBalance, getNonce } from '@/layers/chain';
import {
  generateSalt,
  deriveKey,
  encrypt,
  decrypt,
  stringToBytes,
  bytesToString,
  storeEncryptedVault,
  getEncryptedVault,
  hasVault,
  deleteVault,
} from '@/layers/crypto';
import { SUPPORTED_CHAINS } from '@/lib/types';

interface WalletState {
  // Lock state
  isLocked: boolean;
  hasWallet: boolean;
  isChecking: boolean; // true while checking IndexedDB on mount

  // Wallet state (only populated when unlocked)
  mnemonic: string | null;
  accounts: WardAccount[];
  activeAccountIndex: number;

  // Chain state
  activeChain: WardChain;

  // Settings
  autoLockMs: number;
  setAutoLockMs: (ms: number) => void;

  // Actions
  checkExistingWallet: () => Promise<void>;

  // Onboarding
  createWallet: (password: string) => Promise<{ mnemonic: string }>;
  importWallet: (mnemonic: string, password: string) => Promise<void>;

  // Auth
  unlock: (password: string) => Promise<boolean>;
  /** Verify a password against the vault without changing lock state (re-auth). */
  verifyPassword: (password: string) => Promise<boolean>;
  lock: () => void;

  // Account management
  addAccount: () => Promise<WardAccount>;
  switchAccount: (index: number) => void;

  // Chain management
  switchChain: (chainId: number) => void;

  // Utilities
  getActiveAccount: () => WardAccount | null;

  // Reset
  resetWallet: () => Promise<void>;
}

// New wallets start with a single account, matching mainstream wallets.
const INITIAL_ACCOUNT_COUNT = 1;
// Wallets created before per-wallet metadata existed derived this many,
// so we fall back to it when unlocking a legacy vault with no stored meta.
const LEGACY_ACCOUNT_COUNT = 3;

// Non-sensitive per-wallet metadata (account count, last-used account/chain).
// Addresses are deterministically derivable, so none of this is secret; it
// just lets us restore the user's view across locks instead of resetting.
const META_KEY = 'ward-wallet-meta';

interface WalletMeta {
  accountCount: number;
  activeAccountIndex: number;
  activeChainId: number;
}

function loadMeta(): WalletMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WalletMeta>;
    if (typeof parsed.accountCount !== 'number') return null;
    return {
      accountCount: parsed.accountCount,
      activeAccountIndex: parsed.activeAccountIndex ?? 0,
      activeChainId: parsed.activeChainId ?? SUPPORTED_CHAINS[0].id,
    };
  } catch {
    return null;
  }
}

function saveMeta(patch: Partial<WalletMeta>) {
  if (typeof window === 'undefined') return;
  const current = loadMeta() ?? {
    accountCount: INITIAL_ACCOUNT_COUNT,
    activeAccountIndex: 0,
    activeChainId: SUPPORTED_CHAINS[0].id,
  };
  localStorage.setItem(META_KEY, JSON.stringify({ ...current, ...patch }));
}

function clearMeta() {
  if (typeof window !== 'undefined') localStorage.removeItem(META_KEY);
}

// ---- Account discovery (used on import) ----
// Scan derivation indices for on-chain activity (a balance or any past tx)
// across supported chains, so importing a recovery phrase surfaces funded
// accounts instead of only Account 1. Stops after a run of empty indices.
const DISCOVERY_MAX_INDEX = 10;
const DISCOVERY_GAP_LIMIT = 1;

async function isAccountActive(address: `0x${string}`): Promise<boolean> {
  const checks = SUPPORTED_CHAINS.map(async (chain) => {
    try {
      const [bal, nonce] = await Promise.all([
        getBalance(address, chain),
        getNonce(address, chain),
      ]);
      return bal.wei > 0n || nonce > 0;
    } catch {
      return false; // a single chain/provider failure shouldn't abort discovery
    }
  });
  return (await Promise.all(checks)).some(Boolean);
}

async function discoverAccountCount(seed: Uint8Array): Promise<number> {
  let count = 1; // always keep at least the first account
  let gap = 0;
  for (let i = 0; i < DISCOVERY_MAX_INDEX; i++) {
    const { address } = deriveAccount(seed, i);
    if (await isAccountActive(address)) {
      count = i + 1;
      gap = 0;
    } else if (i > 0 && ++gap > DISCOVERY_GAP_LIMIT) {
      break;
    }
  }
  return count;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isLocked: true,
  hasWallet: false,
  isChecking: true,
  mnemonic: null,
  accounts: [],
  activeAccountIndex: 0,
  activeChain: SUPPORTED_CHAINS[0],

  // ---- Settings ----
  autoLockMs:
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('ward-autolock')) || 5 * 60 * 1000
      : 5 * 60 * 1000,
  setAutoLockMs: (ms: number) => {
    if (typeof window !== 'undefined') localStorage.setItem('ward-autolock', String(ms));
    set({ autoLockMs: ms });
  },

  // ---- Check for existing vault on mount ----
  checkExistingWallet: async () => {
    try {
      const exists = await hasVault();
      set({ hasWallet: exists, isChecking: false });
    } catch {
      set({ isChecking: false });
    }
  },

  // ---- Create a new wallet ----
  createWallet: async (password: string) => {
    const mnemonic = generateMnemonic();
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const plaintext = stringToBytes(mnemonic);
    const { ciphertext, iv } = await encrypt(key, plaintext);

    const vault: EncryptedVault = {
      ciphertext,
      iv,
      salt,
      iterations: 600_000,
      version: 1,
    };

    await storeEncryptedVault(vault);

    // Derive the first account. More can be added later via addAccount().
    const seed = mnemonicToSeed(mnemonic);
    const accounts = deriveAccounts(seed, INITIAL_ACCOUNT_COUNT);
    saveMeta({
      accountCount: INITIAL_ACCOUNT_COUNT,
      activeAccountIndex: 0,
      activeChainId: get().activeChain.id,
    });

    set({
      hasWallet: true,
      isLocked: false,
      mnemonic,
      accounts,
      activeAccountIndex: 0,
    });

    return { mnemonic };
  },

  // ---- Import existing wallet ----
  importWallet: async (mnemonic: string, password: string) => {
    const normalized = mnemonic.trim().toLowerCase();
    if (!validateMnemonic(normalized)) {
      throw new Error('Invalid recovery phrase');
    }

    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const plaintext = stringToBytes(normalized);
    const { ciphertext, iv } = await encrypt(key, plaintext);

    const vault: EncryptedVault = {
      ciphertext,
      iv,
      salt,
      iterations: 600_000,
      version: 1,
    };

    await storeEncryptedVault(vault);

    // Discover how many accounts this phrase has used on-chain, so funds on
    // accounts beyond the first aren't hidden after an import.
    const seed = mnemonicToSeed(normalized);
    const count = await discoverAccountCount(seed);
    const accounts = deriveAccounts(seed, count);
    saveMeta({
      accountCount: count,
      activeAccountIndex: 0,
      activeChainId: get().activeChain.id,
    });

    set({
      hasWallet: true,
      isLocked: false,
      mnemonic: normalized,
      accounts,
      activeAccountIndex: 0,
    });
  },

  // ---- Unlock existing wallet ----
  unlock: async (password: string) => {
    const vault = await getEncryptedVault();
    if (!vault) return false;

    try {
      const key = await deriveKey(password, vault.salt);
      const decrypted = await decrypt(key, vault.ciphertext, vault.iv);
      const mnemonic = bytesToString(decrypted);

      if (!validateMnemonic(mnemonic)) {
        return false;
      }

      // Restore the user's prior view. Legacy vaults predate stored meta, so
      // fall back to the old default count to keep their accounts visible.
      const seed = mnemonicToSeed(mnemonic);
      const meta = loadMeta();
      const count = Math.max(meta?.accountCount ?? LEGACY_ACCOUNT_COUNT, 1);
      const accounts = deriveAccounts(seed, count);
      const activeAccountIndex = Math.min(
        Math.max(meta?.activeAccountIndex ?? 0, 0),
        accounts.length - 1,
      );
      const activeChain =
        SUPPORTED_CHAINS.find((c) => c.id === meta?.activeChainId) ?? get().activeChain;

      // Persist the resolved meta so a legacy vault's count survives future locks.
      saveMeta({ accountCount: count, activeAccountIndex, activeChainId: activeChain.id });

      set({
        isLocked: false,
        mnemonic,
        accounts,
        activeAccountIndex,
        activeChain,
      });

      return true;
    } catch {
      return false;
    }
  },

  // ---- Verify password without unlocking (for sensitive re-auth) ----
  verifyPassword: async (password: string) => {
    const vault = await getEncryptedVault();
    if (!vault) return false;
    try {
      const key = await deriveKey(password, vault.salt);
      const decrypted = await decrypt(key, vault.ciphertext, vault.iv);
      return validateMnemonic(bytesToString(decrypted));
    } catch {
      return false;
    }
  },

  // ---- Lock wallet (wipe keys from memory) ----
  lock: () => {
    set({
      isLocked: true,
      mnemonic: null,
      accounts: [],
      activeAccountIndex: 0,
    });
  },

  // ---- Add a new HD account ----
  addAccount: async () => {
    const { mnemonic, accounts } = get();
    if (!mnemonic) throw new Error('Wallet is locked');

    const seed = mnemonicToSeed(mnemonic);
    const newAccounts = deriveAccounts(seed, accounts.length + 1);
    const newAccount = newAccounts[newAccounts.length - 1];

    set({ accounts: newAccounts });
    saveMeta({ accountCount: newAccounts.length });
    return newAccount;
  },

  // ---- Switch active account ----
  switchAccount: (index: number) => {
    set({ activeAccountIndex: index });
    saveMeta({ activeAccountIndex: index });
  },

  // ---- Switch active chain ----
  switchChain: (chainId: number) => {
    const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
    if (chain) {
      set({ activeChain: chain });
      saveMeta({ activeChainId: chain.id });
    }
  },

  // ---- Get active account ----
  getActiveAccount: () => {
    const { accounts, activeAccountIndex } = get();
    return accounts[activeAccountIndex] ?? null;
  },

  // ---- Full reset (delete vault) ----
  resetWallet: async () => {
    await deleteVault();
    clearMeta();
    set({
      isLocked: true,
      hasWallet: false,
      mnemonic: null,
      accounts: [],
      activeAccountIndex: 0,
    });
  },
}));
