export interface Token {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
}

export interface SwapStats {
  exchangeRate: string;
  fee: string;
  priceImpact: string;
  minimumReceived: string;
  slippage?: string;
}

export interface SwapStatsType {
  tokenA: string;
  tokenB: string;
  exchangeRate: string;
  fee: number;
  feeUSD: string;
  priceImpact: number;
  minimumReceived: string;
}

export interface SwapStatsProps {
  stats: SwapStatsType;
}

// Enhanced swap parameters
export interface SwapParams {
  poolAddress: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  minOutputAmount: string;
  slippageTolerance: number;
  deadline: number;
}

// Swap execution result
export interface SwapResult {
  signature: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  fee: string;
  priceImpact: number;
  executionPrice: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

// Swap quote information
export interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  exchangeRate: string;
  fee: string;
  priceImpact: number;
  minimumReceived: string;
  route: SwapRoute[];
  validUntil: number;
}

// Swap route information
export interface SwapRoute {
  poolAddress: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  fee: number;
}

// Swap settings and preferences
export interface SwapSettings {
  slippageTolerance: number;
  deadlineMinutes: number;
  autoApprove: boolean;
  showRoute: boolean;
  gasOptimization: boolean;
}

// Swap history item
export interface SwapHistoryItem {
  signature: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  fee: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockTime?: number;
}

// Price impact levels
export enum PriceImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme'
}

// Swap validation result
export interface SwapValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  priceImpactLevel: PriceImpactLevel;
  recommendedSlippage: number;
}