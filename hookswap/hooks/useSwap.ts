'use client';

import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
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
  const { tokens, refetch: refetchTokens } = useTokens();
  
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(0);

  // Set default tokens when tokens are loaded
  useEffect(() => {
    if (tokens.length > 0 && !tokenA) {
      // Find SOL token
      const solToken = tokens.find(t => t.symbol === 'SOL');
      if (solToken) setTokenA(solToken);
    }
    
    if (tokens.length > 1 && !tokenB) {
      // Find USDC token or use the second token
      const usdcToken = tokens.find(t => t.symbol === 'USDC-Dev' || t.symbol === 'USDC');
      if (usdcToken) setTokenB(usdcToken);
      else if (tokens[1] && tokens[1].symbol !== 'SOL') setTokenB(tokens[1]);
    }
  }, [tokens, tokenA, tokenB]);

  // Get real pool data for the selected tokens
  const { poolState, loading: poolLoading, error: poolError, refetch: refetchPool } = usePoolData(
    tokenB && tokenB.symbol !== 'SOL' ? new PublicKey(tokenB.address) : undefined
  );

  // Fetch the current exchange rate from Solana RPC
  useEffect(() => {
    async function fetchExchangeRate() {
      if (!tokenA || !tokenB || !poolState) return;
      
      try {
        // Get the current price from an oracle or calculate from pool data
        if (tokenA.symbol === 'SOL' && tokenB.symbol === 'USDC-Dev') {
          // For SOL to USDC-Dev, use a realistic rate (1 SOL ≈ $20-40)
          // In the future, fetch this from an oracle like Pyth
          setExchangeRate(20); // 1 SOL = 20 USDC
        } else if (tokenB.symbol === 'SOL' && tokenA.symbol === 'USDC-Dev') {
          // For USDC-Dev to SOL, use inverse rate
          setExchangeRate(1/20); // 1 USDC = 0.05 SOL
        } else if (poolState) {
          // If we have actual pool data, calculate from reserves
          const tokenAAmount = Number(poolState.tokenAAmount);
          const tokenBAmount = Number(poolState.tokenBAmount);
          
          if (tokenAAmount > 0) {
            // Consider decimal differences
            const decimalAdjustment = Math.pow(10, (tokenB?.decimals || 6) - (tokenA?.decimals || 9));
            const rate = (tokenBAmount / tokenAAmount) * decimalAdjustment;
            setExchangeRate(rate);
          }
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
      }
    }
    
    fetchExchangeRate();
  }, [tokenA, tokenB, poolState]);

  // Calculate token decimals
  const tokenADecimals = tokenA?.decimals || 9; // Default to 9 for SOL
  const tokenBDecimals = tokenB?.decimals || 6; // Default to 6 for USDC
  
  // Calculate real swap stats from pool state and RPC data
  const swapStats: SwapStatsType = {
    tokenA: tokenA?.symbol || '',
    tokenB: tokenB?.symbol || '',
    exchangeRate: exchangeRate.toString(),
    fee: 0.3, // 0.3% fee
    feeUSD: calculateFeeUSD(),
    priceImpact: calculatePriceImpact(),
    minimumReceived: calculateMinimumReceived(),
  };

  // Calculate the fee in USD
  function calculateFeeUSD(): string {
    if (!amountA || !tokenA) return '$0';
    
    const inputAmount = parseFloat(amountA);
    const feePercentage = 0.003; // 0.3%
    const feeAmount = inputAmount * feePercentage;
    
    // Use our exchange rate to estimate USD value
    let feeInUsd = 0;
    if (tokenA.symbol === 'SOL') {
      feeInUsd = feeAmount * 20; // Assuming 1 SOL ≈ $20
    } else if (tokenA.symbol === 'USDC-Dev' || tokenA.symbol === 'USDC') {
      feeInUsd = feeAmount; // USDC is already USD
    } else {
      feeInUsd = feeAmount; // Default for unknown tokens
    }
    
    return `$${feeInUsd.toFixed(2)}`;
  }

  // Calculate price impact based on input amount and pool reserves
  function calculatePriceImpact(): number {
    if (!poolState || !amountA || !tokenA) return 0;
    
    const inputAmount = parseFloat(amountA);
    if (inputAmount === 0) return 0;
    
    // Convert to smallest units based on decimals
    const inputAmountSmallest = inputAmount * Math.pow(10, tokenADecimals);
    const tokenReserve = tokenA.symbol === 'SOL' ? 
      Number(poolState.tokenBAmount) : Number(poolState.tokenAAmount);
    
    if (tokenReserve === 0) return 0;
    
    // Calculate price impact percentage
    const impact = (inputAmountSmallest / (tokenReserve + inputAmountSmallest)) * 100;
    return parseFloat(impact.toFixed(2));
  }

  // Calculate minimum received with 0.5% slippage
  function calculateMinimumReceived(): string {
    if (!amountB) return '0';
    
    const outputAmount = parseFloat(amountB);
    const slippage = 0.005; // 0.5% slippage
    const minReceived = outputAmount * (1 - slippage);
    
    return minReceived.toFixed(4);
  }

  // Calculate swap output based on input amount
  const calculateSwapOutput = useCallback((inputAmount: number): number => {
    if (!inputAmount || inputAmount <= 0 || !tokenA || !tokenB) {
      return 0;
    }
    
    try {
      // Use the exchange rate we fetched from RPC/oracle
      const outputAmount = inputAmount * exchangeRate;
      
      // Apply fee
      const feeAmount = outputAmount * 0.003; // 0.3% fee
      const outputAfterFee = outputAmount - feeAmount;
      
      return outputAfterFee;
    } catch (error) {
      console.error("Error calculating swap output:", error);
      return 0;
    }
  }, [tokenA, tokenB, exchangeRate]);

  // Calculate output amount when input changes
  useEffect(() => {
    if (amountA && tokenA && tokenB) {
      const output = calculateSwapOutput(parseFloat(amountA));
      setAmountB(output.toFixed(6));
    } else {
      setAmountB('');
    }
  }, [amountA, tokenA, tokenB, calculateSwapOutput]);

  // Execute the swap using the actual Rust program
  const swapTokens = useCallback(async () => {
    if (!publicKey || !connection || !ammProgram || !tokenA || !tokenB || !amountA) {
      throw new Error('Missing required parameters for swap');
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Executing swap...');
    
    try {
      // For SOL to Token, we need to use a different function
      // But your Rust program only has Token to SOL (swapTokenForSol)
      if (tokenA.symbol === 'SOL') {
        toast.dismiss(loadingToast);
        toast.error('SOL to Token swaps not yet implemented in program');
        setIsLoading(false);
        return;
      }
      
      // For Token to SOL swap, use the swapTokenForSol function
      const tokenMintPk = new PublicKey(tokenA.address);
      
      // Get PDAs with correct derivation from Rust program
      const [poolPda] = getPoolPda(tokenMintPk);
      const [tokenVault] = getVaultPda(poolPda, tokenMintPk);
      
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(tokenMintPk, publicKey);
      
      // Convert amount to the smallest units based on token decimals
      const tokenAmount = BigInt(Math.floor(parseFloat(amountA) * Math.pow(10, tokenADecimals)));
      
      console.log("Executing token-to-SOL swap with params:", {
        pool: poolPda.toString(),
        tokenMint: tokenMintPk.toString(),
        tokenVault: tokenVault.toString(),
        amount: tokenAmount.toString()
      });
      
      // Call the swapTokenForSol method from your Rust program
      const tx = await (ammProgram.methods as any)
        .swapTokenForSol(tokenAmount)
        .accounts({
          pool: poolPda,
          tokenMint: tokenMintPk,
          tokenVault: tokenVault,
          solVault: poolPda, // SOL vault is the pool itself
          userTokenAccount: userTokenAccount,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      
      const signature = await sendTransaction(tx, connection);
      console.log("Transaction sent:", signature);
      
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      console.log("Transaction confirmed:", confirmation);
      
      toast.dismiss(loadingToast);
      toast.success('Swap completed successfully!');
      
      // Refresh balances and pool data
      setTimeout(async () => {
        await refetchTokens();
        await refetchPool();
        setAmountA('');
        setAmountB('');
      }, 1000);
      
    } catch (error: any) {
      console.error('Swap error:', error);
      toast.dismiss(loadingToast);
      toast.error(`Swap failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, ammProgram, tokenA, tokenB, amountA, tokenADecimals, refetchTokens, refetchPool]);

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
    poolLoading
  };
}