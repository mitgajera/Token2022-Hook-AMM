'use client';

import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { getPoolPda, PoolState } from '@/lib/anchor';
import { useAnchorPrograms } from './useAnchorPrograms';

export function usePoolData(tokenAMint?: PublicKey, tokenBMint?: PublicKey) {
  const { connection } = useConnection();
  const { ammProgram } = useAnchorPrograms();
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolData = useCallback(async () => {
    if (!ammProgram || !tokenAMint || !tokenBMint) {
      setPoolState(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [poolPda] = getPoolPda(tokenAMint, tokenBMint);
      const poolAccount = await ammProgram.account.pool.fetch(poolPda);
      
      setPoolState(poolAccount as PoolState);
    } catch (err) {
      console.error('Failed to fetch pool data:', err);
      setError('Pool not found or failed to fetch data');
      setPoolState(null);
    } finally {
      setLoading(false);
    }
  }, [ammProgram, tokenAMint, tokenBMint]);

  useEffect(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  // Set up real-time updates
  useEffect(() => {
    if (!ammProgram || !tokenAMint || !tokenBMint) return;

    const [poolPda] = getPoolPda(tokenAMint, tokenBMint);
    
    const subscriptionId = connection.onAccountChange(
      poolPda,
      (accountInfo) => {
        try {
          const poolData = ammProgram.coder.accounts.decode('pool', accountInfo.data);
          setPoolState(poolData as PoolState);
        } catch (err) {
          console.error('Failed to decode pool account:', err);
        }
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, ammProgram, tokenAMint, tokenBMint]);

  return {
    poolState,
    loading,
    error,
    refetch: fetchPoolData,
  };
}