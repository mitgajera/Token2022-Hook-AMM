'use client';

import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { Token } from '@/types/token';
import { SwapStatsType } from '@/types/swap';
import { useTokens } from './useTokens';
import { useAnchorPrograms } from './useAnchorPrograms';
import { usePoolData } from './usePoolData';
import { getPoolPda, getVaultPda } from '@/lib/anchor';
import { toast } from 'react-hot-toast';

export function useSwap() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { ammProgram, connected } = useAnchorPrograms();
  const { tokens } = useTokens();
  
  const [tokenA, setTokenA] = useState<Token | null>(tokens[0] || null);
  const [tokenB, setTokenB] = useState<Token | null>(tokens[1] || null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get real pool data
  const { poolState } = usePoolData(
    tokenA ? new PublicKey(tokenA.address) : undefined,
    tokenB ? new PublicKey(tokenB.address) : undefined
  );

  // Calculate real swap stats from pool state
  const swapStats: SwapStatsType = {
    tokenA: tokenA?.symbol || '',
    tokenB: tokenB?.symbol || '',
    exchangeRate: poolState ? 
      (Number(poolState.tokenBAmount) / Number(poolState.tokenAAmount)).toFixed(6) : 
      '0',
    fee: poolState ? poolState.fee / 100 : 0.3, // Convert from basis points
    feeUSD: poolState && amountA ? 
      ((parseFloat(amountA) * poolState.fee / 10000) * 200).toFixed(2) : // Mock USD price
      '0',
    priceImpact: calculatePriceImpact(),
    minimumReceived: amountB ? (parseFloat(amountB) * 0.995).toFixed(4) : '0',
  };

  function calculatePriceImpact(): number {
    if (!poolState || !amountA) return 0;
    
    const inputAmount = BigInt(parseFloat(amountA) * Math.pow(10, 9)); // Assuming 9 decimals
    const inputReserve = poolState.tokenAAmount;
    const outputReserve = poolState.tokenBAmount;
    
    // Calculate price impact using constant product formula
    const priceImpact = Number(inputAmount) / (Number(inputReserve) + Number(inputAmount));
    return parseFloat((priceImpact * 100).toFixed(2));
  }

  const calculateSwapOutput = useCallback((inputAmount: number, fromToken: string, toToken: string): number => {
    if (!poolState) {
      // Fallback to mock calculation if no pool data
      const mockRate = fromToken === tokens[0]?.address ? 200.5 : 0.005;
      const output = inputAmount * mockRate;
      const feeAdjustedOutput = output * 0.997;
      return parseFloat(feeAdjustedOutput.toFixed(6));
    }

    // Real AMM calculation using constant product formula (x * y = k)
    const inputAmountBN = BigInt(Math.floor(inputAmount * Math.pow(10, 9))); // Assuming 9 decimals
    const inputReserve = poolState.tokenAAmount;
    const outputReserve = poolState.tokenBAmount;
    
    // Calculate output amount: dy = (y * dx) / (x + dx)
    const numerator = outputReserve * inputAmountBN;
    const denominator = inputReserve + inputAmountBN;
    const outputAmount = numerator / denominator;
    
    // Apply fee
    const feeAdjustedOutput = outputAmount * BigInt(10000 - poolState.fee) / BigInt(10000);
    
    return Number(feeAdjustedOutput) / Math.pow(10, 9); // Convert back to decimal
  }, [poolState, tokens]);

  const swapTokens = useCallback(async (amount: number, fromToken: string, toToken: string) => {
    if (!publicKey || !connection || !ammProgram) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Executing swap...');
    
    try {
      const tokenAMintPk = new PublicKey(fromToken);
      const tokenBMintPk = new PublicKey(toToken);
      
      // Derive PDAs
      const [poolPda] = getPoolPda(tokenAMintPk, tokenBMintPk);
      const [tokenAVault] = getVaultPda(poolPda, tokenAMintPk);
      const [tokenBVault] = getVaultPda(poolPda, tokenBMintPk);
      
      // Get user token accounts
      const userTokenAAccount = await getAssociatedTokenAddress(tokenAMintPk, publicKey);
      const userTokenBAccount = await getAssociatedTokenAddress(tokenBMintPk, publicKey);
      
      // Convert amount to proper decimals
      const swapAmount = BigInt(Math.floor(amount * Math.pow(10, 9))); // Assuming 9 decimals
      const minimumAmountOut = BigInt(Math.floor(parseFloat(amountB) * 0.995 * Math.pow(10, 9))); // 0.5% slippage
      
      // Create swap transaction
      const tx = await ammProgram.methods
        .swap({
          amountIn: swapAmount,
          minimumAmountOut,
        })
        .accounts({
          pool: poolPda,
          tokenAMint: tokenAMintPk,
          tokenBMint: tokenBMintPk,
          tokenAVault,
          tokenBVault,
          userTokenAAccount,
          userTokenBAccount,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();
      
      // Send transaction
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.dismiss(loadingToast);
      toast.success('Swap completed successfully!');
      
      // Clear amounts after successful swap
      setAmountA('');
      setAmountB('');
    } catch (error) {
      console.error('Swap error:', error);
      toast.dismiss(loadingToast);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, ammProgram, amountB]);

  return {
    tokenA,
    tokenB,
    amountA,
    amountB,
    setTokenA,
    setTokenB,
    setAmountA,
    setAmountB,
    swapTokens,
    calculateSwapOutput,
    swapStats,
    isLoading,
  };
}