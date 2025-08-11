'use client';

import { useState, useEffect } from 'react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { TokenSelector } from '@/components/swap/TokenSelector';
import { SwapInput } from '@/components/swap/SwapInput';
import { Token } from '@/types/token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useAnchorPrograms } from '@/hooks/useAnchorPrograms';
import { getPoolPda, getVaultPda, getLpMintPda } from '@/lib/anchor';

interface AddLiquidityFormProps {
  onAddLiquidity: (tokenA: string, tokenB: string, amountA: number, amountB: number) => Promise<void>;
  isLoading: boolean;
  connected: boolean;
}

export function AddLiquidityForm({ onAddLiquidity, isLoading, connected }: AddLiquidityFormProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { ammProgram } = useAnchorPrograms();
  
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Auto-calculate amount B based on amount A (simple ratio for demo)
  useEffect(() => {
    if (amountA && parseFloat(amountA) > 0 && tokenA && tokenB) {
      // Simple 1:1 ratio calculation - in real AMM this would be based on pool reserves
      const ratio = 0.001; // 0.001 SOL per token
      setAmountB((parseFloat(amountA) * ratio).toString());
    }
  }, [amountA, tokenA, tokenB]);

  const handleTokenASelect = (token: Token | import('@/types/swap').Token) => {
    // Convert the token if needed
    const convertedToken: Token = {
      address: 'address' in token ? token.address : (token as any).mint,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      balance: token.balance || '0',
      usdValue: 'usdValue' in token ? token.usdValue : '0.00',
      logoURI: token.logoURI
    };
    
    setTokenA(convertedToken);
  };

  const handleTokenBSelect = (token: Token | import('@/types/swap').Token) => {
    const convertedToken: Token = {
      address: 'address' in token ? token.address : (token as any).mint,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      balance: token.balance || '0',
      usdValue: 'usdValue' in token ? token.usdValue : '0.00',
      logoURI: token.logoURI
    };
    
    setTokenB(convertedToken);
  };

  const handleAddLiquidity = async () => {
    if (!connected || !publicKey || !ammProgram) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenA || !tokenB || !amountA || !amountB) {
      toast.error('Please select tokens and enter amounts');
      return;
    }

    if (parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      toast.error('Please enter valid amounts');
      return;
    }

    setIsAdding(true);
    const loadingToast = toast.loading('Adding liquidity...');

    try {
      // Get pool PDA
      const [poolPda] = getPoolPda(new PublicKey(tokenA.address));

      // Get vault PDAs
      const [tokenVaultPda] = getVaultPda(poolPda, new PublicKey(tokenA.address));
      const [solVaultPda] = getVaultPda(poolPda, new PublicKey('So11111111111111111111111111111111111111112'));

      // Get LP mint PDA
      const [lpMintPda] = getLpMintPda(poolPda);

      // Get user token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(tokenA.address),
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const userLpAccount = await getAssociatedTokenAddress(
        lpMintPda,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Create user LP token account if it doesn't exist
      const createLpAccountInstruction = createAssociatedTokenAccountInstruction(
        publicKey,
        userLpAccount,
        publicKey,
        lpMintPda,
        TOKEN_2022_PROGRAM_ID
      );

      // Calculate amounts in smallest units
      const tokenAmount = BigInt(Math.floor(parseFloat(amountA) * Math.pow(10, tokenA.decimals)));
      const solAmount = Math.floor(parseFloat(amountB) * LAMPORTS_PER_SOL);

      // Call AMM program to add liquidity
      const addLiquidityTx = await (ammProgram.methods as any)
        .addLiquidity(tokenAmount, 0) // min_lp_tokens = 0 for now
        .accounts({
          pool: poolPda,
          tokenMint: new PublicKey(tokenA.address),
          tokenVault: tokenVaultPda,
          solVault: solVaultPda,
          lpMint: lpMintPda,
          userTokenAccount,
          userLpTokenAccount: userLpAccount,
          user: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([createLpAccountInstruction])
        .transaction();

      // Add SOL transfer instruction
      const transferSolInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: solVaultPda,
        lamports: solAmount,
      });

      addLiquidityTx.add(transferSolInstruction);

      // Send transaction
      const signature = await sendTransaction(addLiquidityTx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('Liquidity added successfully!', { id: loadingToast });
      
      // Reset form
      setAmountA('');
      setAmountB('');

    } catch (error) {
      console.error('Add liquidity error:', error);
      toast.error('Failed to add liquidity. Please try again.', { id: loadingToast });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Token A Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Token A</span>
          <span className="text-sm text-gray-400">
            Balance: {tokenA?.balance || '0.00'}
          </span>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <SwapInput
              value={amountA}
              onChange={setAmountA}
              placeholder="0.0"
              className="flex-1"
            />
            <TokenSelector
              selectedToken={tokenA}
              onTokenSelect={handleTokenASelect}
            />
          </div>
        </div>
      </div>

      {/* Token B Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Token B (SOL)</span>
          <span className="text-sm text-gray-400">
            Balance: {tokenB?.balance || '0.00'}
          </span>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <SwapInput
              value={amountB}
              onChange={setAmountB}
              placeholder="0.0"
              className="flex-1"
            />
            <TokenSelector
              selectedToken={tokenB}
              onTokenSelect={handleTokenBSelect}
            />
          </div>
        </div>
      </div>

      {/* Add Liquidity Button */}
      <Button
        onClick={handleAddLiquidity}
        disabled={!tokenA || !tokenB || !amountA || !amountB || isLoading || isAdding}
        className="w-full glass-button text-white font-semibold py-3 text-lg hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAdding ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Adding Liquidity...</span>
          </div>
        ) : connected ? (
          'Add Liquidity'
        ) : (
          'Connect Wallet to Add Liquidity'
        )}
      </Button>

      {/* Info Section */}
      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h3 className="font-medium text-blue-400 mb-2">Liquidity Information</h3>
        <p className="text-sm text-blue-300">
          Adding liquidity helps maintain the pool and earns you trading fees. 
          The ratio between tokens determines the exchange rate.
        </p>
      </div>
    </div>
  );
}