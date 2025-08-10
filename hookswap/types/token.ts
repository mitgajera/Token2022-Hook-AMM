export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  usdValue: string;
  logoURI?: string;
}