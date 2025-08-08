'use client';

import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { getPoolPda, PoolState } from '@/lib/anchor';
import { useAnchorPrograms } from './useAnchorPrograms';

export function usePoolData(tokenMint?: PublicKey) {
  const { connection } = useConnection();
  const { ammProgram } = useAnchorPrograms();
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolData = useCallback(async () => {
    if (!ammProgram || !tokenMint) {
      setPoolState(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get pool PDA based on token mint
      const [poolPda] = getPoolPda(tokenMint);
      
      // First check if the account exists
      const accountInfo = await connection.getAccountInfo(poolPda);
      if (!accountInfo) {
        console.log(`Pool account for mint ${tokenMint.toString()} not found`);
        setError('Pool does not exist');
        setPoolState(null);
        setLoading(false);
        return;
      }
      
      // Fetch the pool account data from the blockchain
      console.log(`Fetching pool account for mint ${tokenMint.toString()}`);
      const poolAccount = await ammProgram.account.pool.fetch(poolPda);
      console.log("Pool account data:", poolAccount);
      
      // Get vault addresses from pool account
      const tokenVault = new PublicKey(poolAccount.tokenVault);
      const solVault = new PublicKey(poolAccount.solVault);
      
      // Fetch actual token balance from vault
      const tokenBalance = await connection.getTokenAccountBalance(tokenVault);
      const tokenAmount = BigInt(tokenBalance?.value?.amount || 0);
      
      // Fetch actual SOL balance from SOL vault
      const solBalance = await connection.getBalance(solVault);
      const solAmount = BigInt(solBalance);
      
      // Create a complete pool state object with real data
      const poolStateData: PoolState = {
        tokenMint: poolAccount.tokenMint,
        tokenVault: poolAccount.tokenVault,
        solVault: poolAccount.solVault,
        bump: poolAccount.bump,
        fee: 30, // 0.3% fee = 30 basis points
        tokenAAmount: tokenAmount,
        tokenBAmount: solAmount,
        lpSupply: BigInt(0), // Your program doesn't use LP tokens yet
      };
      
      setPoolState(poolStateData);
      console.log("Updated pool state:", poolStateData);
      
    } catch (err) {
      console.error('Failed to fetch pool data:', err);
      setError('Error fetching pool data from blockchain');
      setPoolState(null);
    } finally {
      setLoading(false);
    }
  }, [ammProgram, tokenMint, connection]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  // Set up subscription for real-time updates
  useEffect(() => {
    if (!tokenMint || !connection) return;
    
    const [poolPda] = getPoolPda(tokenMint);
    const subscriptionId = connection.onAccountChange(poolPda, () => {
      console.log("Pool account changed, refreshing data");
      fetchPoolData();
    });
    
    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [tokenMint, connection, fetchPoolData]);

  return {
    poolState,
    loading,
    error,
    refetch: fetchPoolData,
  };
}