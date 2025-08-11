// Hook program settings
export interface HookProgramSettings {
  authority: string;
  createdAt: number;
  isActive: boolean;
  updatedAt: number;
}

// KYC data structure
export interface KycData {
  user: string;
  status: number; // 0 = revoked, 1 = approved
  createdAt: number;
  revokedAt?: number;
}

// Mint transfer limits
export interface MintLimits {
  mint: string;
  dailyLimit: string;
  transactionLimit: string;
  isActive: boolean;
  updatedAt: number;
}

// User usage tracking
export interface UserUsageData {
  user: string;
  dailyUsed: string;
  lastResetDay: number;
  lastTransaction: number;
}

// Transfer limits configuration
export interface TransferLimitsConfig {
  dailyLimit: string;
  transactionLimit: string;
}

// Hook validation result
export interface HookValidationResult {
  isValid: boolean;
  kycStatus: 'approved' | 'revoked' | 'pending';
  transferAllowed: boolean;
  limitsExceeded: boolean;
  dailyRemaining: string;
  transactionRemaining: string;
  error?: string;
}

// Hook program authority actions
export interface HookAuthorityAction {
  action: 'create_kyc' | 'revoke_kyc' | 'update_authority' | 'set_transfer_limits';
  target: string;
  params?: any;
  timestamp: number;
  authority: string;
}

// Hook program events
export interface HookEvent {
  type: 'kyc_created' | 'kyc_revoked' | 'authority_updated' | 'limits_set' | 'transfer_validated';
  data: any;
  timestamp: number;
  signature: string;
}

// Hook configuration for tokens
export interface TokenHookConfig {
  mint: string;
  hookProgram: string;
  isEnabled: boolean;
  kycRequired: boolean;
  transferLimits: TransferLimitsConfig;
  whitelistedPrograms: string[];
  createdAt: number;
  updatedAt: number;
}

// Hook program status
export interface HookProgramStatus {
  programId: string;
  isActive: boolean;
  totalKycAccounts: number;
  totalMintLimits: number;
  totalTransfers: number;
  lastActivity: number;
  version: string;
}
