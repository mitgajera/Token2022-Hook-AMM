'use client';

import { useState, useCallback, useEffect } from 'react';
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
  const [userLpBalance, setUserLpBalance] = useState('0');

  // Get real pool data - you might want to pass specific token mints here
  const { poolState } = usePoolData();

  // Calculate real pool statistics from on-chain data
  const poolStats: PoolStatsType = poolState ? {
    // Only use real data
    totalValueLocked: ((Number(poolState.tokenAAmount) / Math.pow(10, 9)) * 200 + 
                      (Number(poolState.tokenBAmount) / Math.pow(10, 6))).toLocaleString(),
    tvlChange: 0, // Use 0 as default when no historical data
    lpTokenSupply: (Number(poolState.lpSupply) / Math.pow(10, 9)).toLocaleString(),
    userShare: 0, // Will be calculated with actual user LP balance
    userLPBalance: '0', // Will be updated with actual balance
    volume24h: '0', // Will be updated with actual volume
    volumeChange: 0,
    tokenAReserve: (Number(poolState.tokenAAmount) / Math.pow(10, 9)).toFixed(2),
    tokenBReserve: (Number(poolState.tokenBAmount) / Math.pow(10, 6)).toFixed(2),
  } : {
    // Empty/zero values when no pool data
    totalValueLocked: '0',
    tvlChange: 0,
    lpTokenSupply: '0',
    userShare: 0,
    userLPBalance: '0',
    volume24h: '0',
    volumeChange: 0,
    tokenAReserve: '0',
    tokenBReserve: '0',
  };

  // Fetch user LP balance
  useEffect(() => {
    if (!connected || !publicKey || !poolState) return;
    
    const fetchLpBalance = async () => {
      try {
        const [lpMint] = getLpMintPda(poolState.tokenAMint, poolState.tokenBMint);
        const userLpAccount = await getAssociatedTokenAddress(lpMint, publicKey);
        
        // Check if account exists
        const accountInfo = await connection.getAccountInfo(userLpAccount);
        if (!accountInfo) {
          setUserLpBalance('0');
          return;
        }
        
        // Parse token account data
        const accountData = await connection.getTokenAccountBalance(userLpAccount);
        setUserLpBalance(accountData.value.uiAmount.toString());
      } catch (err) {
        console.error('Error fetching LP balance:', err);
        setUserLpBalance('0');
      }
    };
    
    fetchLpBalance();
  }, [connected, publicKey, poolState, connection]);

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
      const lpTokensToBurn = BigInt(Math.floor(parseFloat(userLpBalance) * (percentage / 100) * Math.pow(10, 9)));
      
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
  }, [publicKey, connection, ammProgram, userLpBalance]);

  return {
    poolStats,
    addLiquidity,
    removeLiquidity,
    isLoading,
  };
}