// Wallet connection states
export enum WalletConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// Wallet information
export interface WalletInfo {
  publicKey: string;
  balance: string;
  connected: boolean;
  walletName?: string;
  walletIcon?: string;
}

// Transaction status
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

// Transaction information
export interface Transaction {
  signature: string;
  status: TransactionStatus;
  blockTime?: number;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
  error?: string;
  fee?: number;
  slot?: number;
}

// Transaction request
export interface TransactionRequest {
  instructions: any[];
  signers?: any[];
  feePayer?: string;
  recentBlockhash?: string;
  computeUnits?: number;
}

// Wallet adapter information
export interface WalletAdapter {
  name: string;
  url: string;
  icon: string;
  adapter: any;
}

// Network information
export interface NetworkInfo {
  name: string;
  endpoint: string;
  chainId: string;
  isTestnet: boolean;
  explorerUrl: string;
}

// Account balance information
export interface AccountBalance {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

// Wallet settings
export interface WalletSettings {
  autoApprove: boolean;
  confirmTransactions: boolean;
  showBalances: boolean;
  defaultSlippage: number;
  networkPreference: string;
}
