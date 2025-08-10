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