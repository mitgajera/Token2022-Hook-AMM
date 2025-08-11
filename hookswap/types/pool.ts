export interface PoolStatsType {
  totalValueLocked: string;
  tvlChange: number;
  lpTokenSupply: string;
  userShare: number;
  userLPBalance: string;
  volume24h: string;
  volumeChange: number;
  tokenAReserve: string;
  tokenBReserve: string;
}

// Enhanced pool information matching the AMM program structure
export interface Pool {
  address: string;
  tokenMint: string;
  tokenVault: string;
  solVault: string;
  lpMint: string;
  bump: number;
  feeNumerator: number;
  feeDenominator: number;
  createdAt: number;
  isActive: boolean;
}

// Pool creation parameters
export interface CreatePoolParams {
  tokenMint: string;
  initialTokenAmount: string;
  initialSolAmount: string;
  feeNumerator?: number;
  feeDenominator?: number;
}

// Liquidity addition parameters
export interface AddLiquidityParams {
  poolAddress: string;
  tokenAmount: string;
  minLpTokens: string;
  slippageTolerance?: number;
}

// Liquidity removal parameters
export interface RemoveLiquidityParams {
  poolAddress: string;
  lpAmount: string;
  minTokenAmount: string;
  minSolAmount: string;
  slippageTolerance?: number;
}

// Pool state for real-time updates
export interface PoolState {
  pool: Pool;
  tokenReserve: string;
  solReserve: string;
  lpTokenSupply: string;
  totalValueLocked: string;
  volume24h: string;
  fees24h: string;
  lastUpdated: number;
}

// Pool performance metrics
export interface PoolMetrics {
  poolAddress: string;
  apr: number;
  apy: number;
  impermanentLoss: number;
  totalFees: string;
  totalVolume: string;
  uniqueUsers: number;
  createdAt: number;
}

// Pool transaction history
export interface PoolTransaction {
  signature: string;
  poolAddress: string;
  type: 'add_liquidity' | 'remove_liquidity' | 'swap';
  user: string;
  amountA: string;
  amountB: string;
  timestamp: number;
  fee: string;
}

// Pool configuration
export interface PoolConfig {
  poolAddress: string;
  maxSlippage: number;
  maxPriceImpact: number;
  minLiquidity: string;
  whitelistedHooks: string[];
  isPaused: boolean;
  emergencyStop: boolean;
}