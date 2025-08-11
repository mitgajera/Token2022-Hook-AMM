export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  usdValue: string;
  logoURI?: string;
}

// Enhanced token interface for more detailed token information
export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  usdValue?: string;
  supply?: string;
  marketCap?: string;
}

// Token account information
export interface TokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
  isFrozen: boolean;
  isNative: boolean;
  nativeAmount?: string;
}

// KYC status for tokens with transfer hooks
export interface KycStatus {
  user: string;
  status: 'approved' | 'revoked' | 'pending';
  createdAt: number;
  revokedAt?: number;
  isActive: boolean;
}

// Transfer limits for tokens
export interface TransferLimits {
  dailyLimit: string;
  transactionLimit: string;
  isActive: boolean;
  updatedAt: number;
}

// User usage tracking for transfer limits
export interface UserUsage {
  user: string;
  mint: string;
  dailyUsed: string;
  lastResetDay: number;
  lastTransaction: number;
}

// Token metadata for display purposes
export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  description?: string;
  website?: string;
  twitter?: string;
  tags?: string[];
}

// Token price information
export interface TokenPrice {
  mint: string;
  priceUSD: string;
  priceChange24h: number;
  volume24h: string;
  marketCap: string;
  lastUpdated: number;
}