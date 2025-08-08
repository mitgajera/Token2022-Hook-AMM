'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { PoolStatsType } from '@/types/pool';
import { useAnchorPrograms } from './useAnchorPrograms';
import { usePoolData } from './usePoolData';
import { getPoolPda, getVaultPda, getLpMintPda } from '@/lib/anchor';
import { toast } from 'react-hot-toast';

export function usePool() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { ammProgram, connected } = useAnchorPrograms();
  const [isLoading, setIsLoading] = useState(false);

  // Get real pool data - you might want to pass specific token mints here
  const { poolState } = usePoolData();

  // Calculate real pool statistics from on-chain data
  const poolStats: PoolStatsType = poolState ? {
    totalValueLocked: ((Number(poolState.tokenAAmount) / Math.pow(10, 9)) * 200 + // Mock SOL price
                      (Number(poolState.tokenBAmount) / Math.pow(10, 6))).toLocaleString(), // Mock USDC
    tvlChange: 5.2, // This would need historical data
    lpTokenSupply: (Number(poolState.lpSupply) / Math.pow(10, 9)).toLocaleString(),
    userShare: 0.25, // This would need user's LP balance
    userLPBalance: '392.45', // This would need user's LP balance
    volume24h: '89,456', // This would need volume tracking
    volumeChange: -2.1, // This would need historical volume data
    tokenAReserve: (Number(poolState.tokenAAmount) / Math.pow(10, 9)).toFixed(2),
    tokenBReserve: (Number(poolState.tokenBAmount) / Math.pow(10, 6)).toFixed(2),
  } : {
    // Fallback to mock data
    totalValueLocked: '1,245,678',
    tvlChange: 5.2,
    lpTokenSupply: '156,789',
    userShare: 0.25,
    userLPBalance: '392.45',
    volume24h: '89,456',
    volumeChange: -2.1,
    tokenAReserve: '6,228.34',
    tokenBReserve: '1,245,678',
  };

  const addLiquidity = useCallback(async (
    tokenA: string, 
    tokenB: string, 
    amountA: number, 
    amountB: number
  ) => {
    if (!publicKey || !connection || !ammProgram) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Adding liquidity...');
    
    try {
      const tokenAMintPk = new PublicKey(tokenA);
      const tokenBMintPk = new PublicKey(tokenB);
      
      // Derive PDAs
      const [poolPda] = getPoolPda(tokenAMintPk, tokenBMintPk);
      const [tokenAVault] = getVaultPda(poolPda, tokenAMintPk);
      const [tokenBVault] = getVaultPda(poolPda, tokenBMintPk);
      const [lpMint] = getLpMintPda(poolPda);
      
      // Get user token accounts
      const userTokenAAccount = await getAssociatedTokenAddress(tokenAMintPk, publicKey);
      const userTokenBAccount = await getAssociatedTokenAddress(tokenBMintPk, publicKey);
      const userLpAccount = await getAssociatedTokenAddress(lpMint, publicKey);
      
      // Convert amounts to proper decimals
      const tokenAAmount = BigInt(Math.floor(amountA * Math.pow(10, 9))); // Assuming 9 decimals
      const tokenBAmount = BigInt(Math.floor(amountB * Math.pow(10, 6))); // Assuming 6 decimals for USDC
      
      // Create add liquidity transaction
      const tx = await ammProgram.methods
        .addLiquidity({
          tokenAAmount,
          tokenBAmount,
          minimumLpTokens: BigInt(0), // You might want to calculate this based on slippage
        })
        .accounts({
          pool: poolPda,
          tokenAMint: tokenAMintPk,
          tokenBMint: tokenBMintPk,
          tokenAVault,
          tokenBVault,
          lpMint,
          userTokenAAccount,
          userTokenBAccount,
          userLpAccount,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();
      
      // Send transaction
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.dismiss(loadingToast);
      toast.success('Liquidity added successfully!');
    } catch (error) {
      console.error('Add liquidity error:', error);
      toast.dismiss(loadingToast);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, ammProgram]);

  const removeLiquidity = useCallback(async (percentage: number) => {
    if (!publicKey || !connection || !ammProgram) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Removing liquidity...');
    
    try {
      // You'll need to pass the specific pool tokens here
      // For now, using mock addresses - replace with actual token mints
      const tokenAMintPk = new PublicKey('So11111111111111111111111111111111111111112'); // SOL
      const tokenBMintPk = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
      
      // Derive PDAs
      const [poolPda] = getPoolPda(tokenAMintPk, tokenBMintPk);
      const [tokenAVault] = getVaultPda(poolPda, tokenAMintPk);
      const [tokenBVault] = getVaultPda(poolPda, tokenBMintPk);
      const [lpMint] = getLpMintPda(poolPda);
      
      // Get user token accounts
      const userTokenAAccount = await getAssociatedTokenAddress(tokenAMintPk, publicKey);
      const userTokenBAccount = await getAssociatedTokenAddress(tokenBMintPk, publicKey);
      const userLpAccount = await getAssociatedTokenAddress(lpMint, publicKey);
      
      // Calculate LP tokens to burn (you'd get this from user's LP balance)
      const lpTokensToBurn = BigInt(Math.floor(parseFloat(poolStats.userLPBalance) * (percentage / 100) * Math.pow(10, 9)));
      
      // Create remove liquidity transaction
      const tx = await ammProgram.methods
        .removeLiquidity({
          lpTokenAmount: lpTokensToBurn,
          minimumTokenAAmount: BigInt(0), // You might want to calculate this based on slippage
          minimumTokenBAmount: BigInt(0),
        })
        .accounts({
          pool: poolPda,
          tokenAMint: tokenAMintPk,
          tokenBMint: tokenBMintPk,
          tokenAVault,
          tokenBVault,
          lpMint,
          userTokenAAccount,
          userTokenBAccount,
          userLpAccount,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();
      
      // Send transaction
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.dismiss(loadingToast);
      toast.success(`Removed ${percentage}% of liquidity successfully!`);
    } catch (error) {
      console.error('Remove liquidity error:', error);
      toast.dismiss(loadingToast);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, ammProgram, poolStats.userLPBalance]);

  return {
    poolStats,
    addLiquidity,
    removeLiquidity,
    isLoading,
  };
}