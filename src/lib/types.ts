// ============================================================
// Ward — Shared Types & Constants
// ============================================================

import type { Chain } from 'viem/chains';
import { sepolia, baseSepolia, optimismSepolia, arbitrumSepolia, polygonAmoy } from 'viem/chains';

// ---- Chain Types ----

export interface WardChain {
  id: number;
  name: string;
  shortName: string;
  viemChain: Chain;
  rpcUrl: string;
  explorerUrl: string;
  nativeToken: string;
}

export const SUPPORTED_CHAINS: WardChain[] = [
  {
    id: sepolia.id,
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    viemChain: sepolia,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeToken: 'ETH',
  },
  {
    id: baseSepolia.id,
    name: 'Base Sepolia',
    shortName: 'Base',
    viemChain: baseSepolia,
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeToken: 'ETH',
  },
  {
    id: optimismSepolia.id,
    name: 'OP Sepolia',
    shortName: 'Optimism',
    viemChain: optimismSepolia,
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    nativeToken: 'ETH',
  },
  {
    id: arbitrumSepolia.id,
    name: 'Arbitrum Sepolia',
    shortName: 'Arbitrum',
    viemChain: arbitrumSepolia,
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeToken: 'ETH',
  },
  {
    id: polygonAmoy.id,
    name: 'Polygon Amoy',
    shortName: 'Polygon',
    viemChain: polygonAmoy,
    rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2',
    explorerUrl: 'https://amoy.polygonscan.com',
    nativeToken: 'POL',
  },
];

// ---- Account Types ----

export interface WardAccount {
  index: number;
  address: `0x${string}`;
  name: string;
  path: string; // BIP-44 derivation path
}

// ---- Crypto Types ----

export interface EncryptedVault {
  ciphertext: string; // base64-encoded
  iv: string; // base64-encoded
  salt: string; // base64-encoded
  iterations: number;
  version: number;
}

// ---- Key Material Types ----

export interface UnlockedWallet {
  mnemonic: string;
  accounts: WardAccount[];
  createdAt: number;
}

// ---- Transaction Types ----

export interface SendTxRequest {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string; // ETH in wei (hex)
  chainId: number;
  data?: `0x${string}`;
}

export type ActivityStatus = 'pending' | 'confirmed' | 'failed';

export interface ActivityTx {
  hash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  /** native value in wei (string) */
  value: string;
  chainId: number;
  /** decoded interaction kind */
  kind: 'eth_transfer' | 'erc20_approve' | 'erc20_transfer' | 'contract_call' | 'unknown';
  /** short human label for the amount line, e.g. "0.05 ETH" or "Approve USDC" */
  label: string;
  status: ActivityStatus;
  timestamp: number;
}

export interface HistoryItem {
  /** `${hash}:${uniqueId}` — stable across in/out dedupe */
  id: string;
  hash: `0x${string}`;
  direction: 'in' | 'out' | 'self';
  /** the other party (to for outgoing, from for incoming) */
  counterparty: string;
  /** display amount, e.g. "0.05" */
  amount: string;
  asset: string;
  category: 'external' | 'erc20' | 'erc721' | 'erc1155' | 'internal';
  timestamp: number;
}

export interface DecodedCall {
  type: 'eth_transfer' | 'erc20_approve' | 'erc20_transfer' | 'contract_call' | 'unknown';
  functionName?: string;
  params?: Record<string, string | boolean>;
  spender?: string;
  tokenAddress?: string;
  allowance?: string;
}

// ---- Service Types ----

export interface TokenBalance {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  logo?: string;
}

export interface NFTAsset {
  contractAddress: string;
  tokenId: string;
  name?: string;
  image?: string;
  collection?: string;
}

// What the Send flow is moving.
export type SendAsset =
  | { kind: 'native' }
  | { kind: 'erc20'; token: TokenBalance }
  | { kind: 'erc721'; nft: NFTAsset };

// ---- AI-generated fallback message ----
export const TESTNET_DISCLAIMER = 'Sepolia Testnet — No Real Value';
