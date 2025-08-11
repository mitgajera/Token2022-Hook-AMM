'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { useAnchorPrograms } from './useAnchorPrograms';
import { Token, SwapStats } from '@/types/swap';
import { getPoolPda, getVaultPda } from '@/lib/anchor';
import { useTokens } from './useTokens';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

export function useSwap() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { ammProgram } = useAnchorPrograms();
  const { tokens, loading: tokensLoading, refetch: refreshTokens } = useTokens();

  const [tokenA, setTokenAState] = useState<Token | null>(null);
  const [tokenB, setTokenBState] = useState<Token | null>(null);
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolExists, setPoolExists] = useState(false);
  const [swapStats, setSwapStats] = useState<SwapStats>({
    exchangeRate: '0',
    fee: '0.3%',
    priceImpact: '0%',
    minimumReceived: '0.0000'
  });
  const [poolState, setPoolState] = useState<any>(null);

  // Wrap setTokenA and setTokenB to avoid race conditions
  const setTokenA = (token: Token) => {
    console.log("Setting tokenA:", token?.symbol);
    
    // If this token is already selected as tokenB, swap them
    if (tokenB && token.mint === tokenB.mint) {
      console.log("Same token detected, swapping positions");
      setTokenBState(tokenA);
    }
    
    setTokenAState(token);
  };

  const setTokenB = (token: Token) => {
    console.log("Setting tokenB:", token?.symbol);
    
    // If this token is already selected as tokenA, swap them
    if (tokenA && token.mint === tokenA.mint) {
      console.log("Same token detected, swapping positions");
      setTokenAState(tokenB);
    }
    
    setTokenBState(token);
  };

  // Debug token state changes
  useEffect(() => {
    console.log("Token state updated:", {
      tokenA: tokenA?.symbol || "none",
      tokenB: tokenB?.symbol || "none"
    });
  }, [tokenA, tokenB]);

  // Fetch pool data when tokens change
  useEffect(() => {
    if (!tokenA || !tokenB || !connection || !ammProgram) return;
    
    console.log(`Checking pool for ${tokenA.symbol} and ${tokenB.symbol}`);
    
    const fetchPoolData = async () => {
      setPoolLoading(true);
      setPoolExists(false);
      setPoolState(null);
      
      try {
        // Try both directions for the pool
        const mintA = new PublicKey(tokenA.mint);
        const mintB = new PublicKey(tokenB.mint);
        
        // Check first direction
        const [poolPdaAB] = getPoolPda(mintA, mintB);
        
        console.log('Checking pool at:', poolPdaAB.toString());
        
        // Check if pool exists in AB direction
        let accountInfo = await connection.getAccountInfo(poolPdaAB);
        if (accountInfo) {
          console.log('Pool found in A->B direction');
          
          // Fetch pool account data
          const poolAccount = await (ammProgram.account as any).pool.fetch(poolPdaAB);
          console.log('Pool account data:', poolAccount);
          
          // Get vault addresses
          const [tokenAVault] = getVaultPda(poolPdaAB, mintA);
          const [tokenBVault] = getVaultPda(poolPdaAB, mintB);
          
          // Fetch token balances from vaults
          const tokenAVaultInfo = await connection.getTokenAccountBalance(tokenAVault);
          const tokenBVaultInfo = await connection.getTokenAccountBalance(tokenBVault);
          
          const tokenAReserve = tokenAVaultInfo.value.amount;
          const tokenBReserve = tokenBVaultInfo.value.amount;
          
          console.log('Token reserves:', {
            [tokenA.symbol]: tokenAReserve,
            [tokenB.symbol]: tokenBReserve
          });
          
          // Set pool state
          setPoolState({
            address: poolPdaAB.toString(),
            tokenAVault: tokenAVault.toString(),
            tokenBVault: tokenBVault.toString(),
            tokenAReserve,
            tokenBReserve,
            feeNumerator: poolAccount.feeNumerator,
            feeDenominator: poolAccount.feeDenominator,
            direction: 'AB'
          });
          
          setPoolExists(true);
          setPoolLoading(false);
          return;
        }
        
        // Check reverse direction
        const [poolPdaBA] = getPoolPda(mintB, mintA);
        
        console.log('Checking pool at:', poolPdaBA.toString());
        
        // Check if pool exists in BA direction
        accountInfo = await connection.getAccountInfo(poolPdaBA);
        if (accountInfo) {
          console.log('Pool found in B->A direction');
          
          // Fetch pool account data
          const poolAccount = await (ammProgram.account as any).pool.fetch(poolPdaBA);
          console.log('Pool account data:', poolAccount);
          
          // Get vault addresses
          const [tokenBVault] = getVaultPda(poolPdaBA, mintB);
          const [tokenAVault] = getVaultPda(poolPdaBA, mintA);
          
          // Fetch token balances from vaults
          const tokenBVaultInfo = await connection.getTokenAccountBalance(tokenBVault);
          const tokenAVaultInfo = await connection.getTokenAccountBalance(tokenAVault);
          
          const tokenBReserve = tokenBVaultInfo.value.amount;
          const tokenAReserve = tokenAVaultInfo.value.amount;
          
          console.log('Token reserves (reversed):', {
            [tokenB.symbol]: tokenBReserve,
            [tokenA.symbol]: tokenAReserve
          });
          
          // Set pool state
          setPoolState({
            address: poolPdaBA.toString(),
            tokenAVault: tokenAVault.toString(),
            tokenBVault: tokenBVault.toString(),
            tokenAReserve,
            tokenBReserve,
            feeNumerator: poolAccount.feeNumerator,
            feeDenominator: poolAccount.feeDenominator,
            direction: 'BA'
          });
          
          setPoolExists(true);
          setPoolLoading(false);
          return;
        }
        
        console.log('No pool exists for these tokens in either direction');
        setPoolExists(false);
        setPoolState(null);
      } catch (error) {
        console.error('Error checking for pool:', error);
        setPoolExists(false);
        setPoolState(null);
      } finally {
        setPoolLoading(false);
      }
    };

    fetchPoolData();
  }, [tokenA, tokenB, ammProgram, connection]);

  // Calculate output amount when input changes
  useEffect(() => {
    if (!tokenA || !tokenB || !amountA || parseFloat(amountA) <= 0 || !poolState || !poolExists) {
      setAmountB('0.000000');
      return;
    }
    
    try {
      const inputAmount = parseFloat(amountA);
      const tokenADecimals = tokenA.decimals || 9;
      const tokenBDecimals = tokenB.decimals || 9;
      
      // Convert reserves to decimalized values
      const tokenAReserveNum = Number(poolState.tokenAReserve) / Math.pow(10, tokenADecimals);
      const tokenBReserveNum = Number(poolState.tokenBReserve) / Math.pow(10, tokenBDecimals);
      
      if (tokenAReserveNum <= 0 || tokenBReserveNum <= 0) {
        console.log('Invalid pool reserves');
        setAmountB('0.000000');
        return;
      }

      // Calculate exchange rate
      const exchangeRate = tokenBReserveNum / tokenAReserveNum;
      
      // Calculate fee
      const feeNumerator = poolState.feeNumerator || 3;
      const feeDenominator = poolState.feeDenominator || 1000;
      const feeRate = feeNumerator / feeDenominator;
      
      // Calculate output with fee using constant product formula
      const inputWithFee = inputAmount * (1 - feeRate);
      const numerator = inputWithFee * tokenBReserveNum;
      const denominator = tokenAReserveNum + inputWithFee;
      const outputAmount = numerator / denominator;
      
      // Calculate price impact
      const priceImpact = (inputAmount / (tokenAReserveNum + inputAmount)) * 100;
      
      // Calculate minimum received (with 0.5% slippage tolerance)
      const slippageTolerance = 0.005;
      const minimumReceived = outputAmount * (1 - slippageTolerance);
      
      // Update amount and stats
      setAmountB(outputAmount.toFixed(6));
      
      setSwapStats({
        exchangeRate: exchangeRate.toFixed(6),
        fee: `${(feeRate * 100).toFixed(1)}%`,
        priceImpact: `${priceImpact.toFixed(2)}%`,
        minimumReceived: minimumReceived.toFixed(6)
      });
      
    } catch (error) {
      console.error('Error calculating swap amount:', error);
      setAmountB('0.000000');
    }
  }, [tokenA, tokenB, amountA, poolState, poolExists]);

  // Execute swap
  const swapTokens = useCallback(async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!tokenA || !tokenB) {
      toast.error('Please select tokens');
      return;
    }
    
    if (!amountA || parseFloat(amountA) <= 0) {
      toast.error('Please enter an amount');
      return;
    }
    
    if (!ammProgram) {
      toast.error('AMM program not initialized');
      console.error('AMM program not initialized');
      return;
    }
    
    if (!poolExists || !poolState) {
      toast.error('No liquidity pool exists for these tokens');
      console.error('Missing pool for', tokenA.symbol, 'and', tokenB.symbol);
      return;
    }
    
    setIsLoading(true);
    const loadingToast = toast.loading('Preparing swap...');
    
    try {
      // Get input and output amounts with proper decimal handling
      const tokenADecimals = tokenA.decimals || 9;
      const tokenBDecimals = tokenB.decimals || 9;
      
      const inputAmount = BigInt(Math.floor(parseFloat(amountA) * 10 ** tokenADecimals));
      const minOutputAmount = BigInt(Math.floor(parseFloat(amountB) * 0.995 * 10 ** tokenBDecimals));
      
      console.log('Swap amounts:', {
        input: inputAmount.toString(),
        minOutput: minOutputAmount.toString(),
        tokenA: tokenA.symbol,
        tokenB: tokenB.symbol
      });
      
      // Get token mints
      const mintA = new PublicKey(tokenA.mint);
      const mintB = new PublicKey(tokenB.mint);
      
      // Get pool PDA based on the direction we found the pool
      const [poolPda] = poolState.direction === 'AB' 
        ? getPoolPda(mintA, mintB)
        : getPoolPda(mintB, mintA);
      
      console.log('Using pool at:', poolPda.toString());
      
      // Get vault addresses - important to use the right order based on pool direction
      let tokenAVault, tokenBVault;
      
      if (poolState.direction === 'AB') {
        [tokenAVault] = getVaultPda(poolPda, mintA);
        [tokenBVault] = getVaultPda(poolPda, mintB);
      } else {
        [tokenAVault] = getVaultPda(poolPda, mintB);
        [tokenBVault] = getVaultPda(poolPda, mintA);
      }
      
      // Get user token accounts
      const { getAssociatedTokenAddress } = await import('@solana/spl-token');
      const userTokenAAccount = await getAssociatedTokenAddress(
        mintA,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      
      const userTokenBAccount = await getAssociatedTokenAddress(
        mintB,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      
      // Create transaction
      toast.loading('Building transaction...', { id: loadingToast });
      let swapTx = new Transaction();
      
      // Check if we're swapping SOL or tokens
      const isSolToToken = tokenA.mint === "So11111111111111111111111111111111111111112";
      const isTokenToSol = tokenB.mint === "So11111111111111111111111111111111111111112";

      // Use the appropriate swap method based on token types and pool direction
      if (isSolToToken) {
        console.log("Creating SOL to token swap");
        swapTx = await (ammProgram.methods as any)
          .swapSolForToken(inputAmount, minOutputAmount)
          .accounts({
            pool: poolPda,
            tokenMint: mintB,
            tokenVault: tokenBVault,
            solVault: tokenAVault,
            userTokenAccount: userTokenBAccount,
            user: publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId
          })
          .transaction();
      } else if (isTokenToSol) {
        console.log("Creating token to SOL swap");
        swapTx = await (ammProgram.methods as any)
          .swapTokenForSol(inputAmount, minOutputAmount)
          .accounts({
            pool: poolPda,
            tokenMint: mintA,
            tokenVault: tokenAVault,
            solVault: tokenBVault,
            userTokenAccount: userTokenAAccount,
            user: publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId
          })
          .transaction();
      } else {
        console.log("Creating token to token swap");
        // For token-to-token swaps, we need to use the general swap method
        // The direction matters here
        if (poolState.direction === 'AB') {
          swapTx = await (ammProgram.methods as any)
            .swap(inputAmount, minOutputAmount)
            .accounts({
              pool: poolPda,
              tokenAMint: mintA,
              tokenBMint: mintB,
              tokenAVault: tokenAVault,
              tokenBVault: tokenBVault,
              userTokenAAccount: userTokenAAccount,
              userTokenBAccount: userTokenBAccount,
              user: publicKey,
              tokenProgram: TOKEN_2022_PROGRAM_ID
            })
            .transaction();
        } else {
          // If pool is in reverse direction, we need to swap the parameters
          swapTx = await (ammProgram.methods as any)
            .swap(inputAmount, minOutputAmount)
            .accounts({
              pool: poolPda,
              tokenAMint: mintB,
              tokenBMint: mintA,
              tokenAVault: tokenBVault,
              tokenBVault: tokenAVault,
              userTokenAAccount: userTokenBAccount,
              userTokenBAccount: userTokenAAccount,
              user: publicKey,
              tokenProgram: TOKEN_2022_PROGRAM_ID
            })
            .transaction();
        }
      }
      
      // Send and confirm transaction
      toast.loading('Sending transaction...', { id: loadingToast });
      console.log("Sending transaction...");
      
      const signature = await sendTransaction(swapTx, connection, {
        skipPreflight: false
      });
      
      console.log("Transaction sent:", signature);
      
      toast.loading('Confirming transaction...', { id: loadingToast });
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Transaction confirmed!");
      
      toast.success('Swap completed successfully!', { id: loadingToast });
      
      // Reset amounts
      setAmountA('');
      setAmountB('');
      
      // Refresh token balances
      await refreshTokens();
      
    } catch (error) {
      console.error('Swap error:', error);
      let errorMessage = 'Swap failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient balance for this swap';
        } else if (error.message.includes('slippage')) {
          errorMessage = 'Slippage too high. Try a smaller amount';
        } else if (error.message.includes('missing required parameter')) {
          errorMessage = 'Missing parameters. Check your AMM program interface.';
        } else {
          // Log the full error for debugging
          console.error('Full error:', error);
          errorMessage = `Error: ${error.message.substring(0, 100)}`;
        }
      }
      
      toast.error(errorMessage, { id: loadingToast });
      
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, tokenA, tokenB, amountA, amountB, ammProgram, connection, sendTransaction, poolState, poolExists, refreshTokens]);

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
    swapStats,
    isLoading,
    poolLoading,
    poolExists,
    getAvailableTokens: () => tokens,
    poolState,
    tokensLoading
  };
}