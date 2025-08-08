'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Token } from '@/types/token';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Mock token data for development
const MOCK_TOKENS: Token[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    name: 'Wrapped SOL',
    symbol: 'SOL',
    decimals: 9,
    balance: '12.5420',
    usdValue: '2,508.40',
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    balance: '1,250.00',
    usdValue: '1,250.00',
  },
  {
    address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    name: 'Marinade Staked SOL',
    symbol: 'mSOL',
    decimals: 9,
    balance: '8.7531',
    usdValue: '1,750.62',
  },
  {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    name: 'Bonk',
    symbol: 'BONK',
    decimals: 5,
    balance: '1,000,000',
    usdValue: '15.00',
  },
];

export function useTokens() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [tokens, setTokens] = useState<Token[]>(MOCK_TOKENS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      fetchTokenBalances();
    } else {
      // Use mock data when not connected
      setTokens(MOCK_TOKENS);
    }
  }, [connected, publicKey]);

  const fetchTokenBalances = async () => {
    if (!publicKey || !connection) return;

    setLoading(true);
    try {
      // Fetch SOL balance
      const balance = await connection.getBalance(publicKey);
      const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(4);

      // Update SOL token with real balance
      const updatedTokens = tokens.map(token => {
        if (token.symbol === 'SOL') {
          return {
            ...token,
            balance: solBalance,
            usdValue: (parseFloat(solBalance) * 200).toFixed(2), // Mock price
          };
        }
        return token;
      });

      setTokens(updatedTokens);
    } catch (error) {
      console.error('Error fetching token balances:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    tokens,
    loading,
    refetch: fetchTokenBalances,
  };
}