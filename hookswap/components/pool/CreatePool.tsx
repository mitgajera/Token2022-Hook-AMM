'use client';

import { useState, useEffect } from 'react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAnchorPrograms } from '@/hooks/useAnchorPrograms';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useTokens } from '@/hooks/useTokens';
import { AMM_PROGRAM_ID } from '@/lib/anchor';

export function CreatePool() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { ammProgram, connected } = useAnchorPrograms();
  const { tokens, loading: tokensLoading } = useTokens();
  
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [solAmount, setSolAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdPool, setCreatedPool] = useState<PublicKey | null>(null);

  // Calculate SOL amount based on token amount (simple 1:1 ratio for demo)
  useEffect(() => {
    if (tokenAmount && parseFloat(tokenAmount) > 0) {
      setSolAmount((parseFloat(tokenAmount) * 0.001).toString()); // 0.001 SOL per token
    }
  }, [tokenAmount]);

  const createPool = async () => {
    if (!connected || !publicKey || !ammProgram) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!selectedToken || !tokenAmount || !solAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(tokenAmount) <= 0 || parseFloat(solAmount) <= 0) {
      toast.error('Please enter valid amounts');
      return;
    }

    setIsCreating(true);
    const loadingToast = toast.loading('Creating liquidity pool...');

    try {
      const tokenMint = new PublicKey(selectedToken);
      const tokenAmountNum = parseFloat(tokenAmount);
      const solAmountNum = parseFloat(solAmount);

      // Get pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), tokenMint.toBuffer()],
        AMM_PROGRAM_ID
      );

      // Get vault PDAs
      const [tokenVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), poolPda.toBuffer(), tokenMint.toBuffer()],
        AMM_PROGRAM_ID
      );

      const [solVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), poolPda.toBuffer(), Buffer.from('sol')],
        AMM_PROGRAM_ID
      );

      // Get LP mint PDA
      const [lpMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('lp_mint'), poolPda.toBuffer()],
        AMM_PROGRAM_ID
      );

      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Get user LP token account
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

      // Calculate token amount in smallest units
      const tokenDecimals = 9; // Assuming 9 decimals
      const tokenAmountLamports = BigInt(Math.floor(tokenAmountNum * Math.pow(10, tokenDecimals)));
      const solAmountLamports = Math.floor(solAmountNum * LAMPORTS_PER_SOL);

      // Call AMM program to initialize pool
      const initializePoolTx = await (ammProgram.methods as any)
        .initializePool()
        .accounts({
          pool: poolPda,
          tokenMint,
          tokenVault: tokenVaultPda,
          solVault: solVaultPda,
          lpMint: lpMintPda,
          payer: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: PublicKey.findProgramAddressSync([Buffer.from('rent')], SystemProgram.programId)[0],
        })
        .preInstructions([createLpAccountInstruction])
        .transaction();

      // Send transaction
      const signature = await sendTransaction(initializePoolTx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // Add initial liquidity
      const addLiquidityTx = await (ammProgram.methods as any)
        .addLiquidity(tokenAmountLamports, 0) // min_lp_tokens = 0 for first deposit
        .accounts({
          pool: poolPda,
          tokenMint,
          tokenVault: tokenVaultPda,
          solVault: solVaultPda,
          lpMint: lpMintPda,
          userTokenAccount,
          userLpTokenAccount: userLpAccount,
          user: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Add SOL transfer instruction
      const transferSolInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: solVaultPda,
        lamports: solAmountLamports,
      });

      addLiquidityTx.add(transferSolInstruction);

      // Send liquidity transaction
      const liquiditySignature = await sendTransaction(addLiquidityTx, connection);
      await connection.confirmTransaction(liquiditySignature, 'confirmed');

      toast.success('Pool created successfully!', { id: loadingToast });
      setCreatedPool(poolPda);
      
      // Reset form
      setSelectedToken('');
      setTokenAmount('');
      setSolAmount('');

    } catch (error) {
      console.error('Error creating pool:', error);
      toast.error('Failed to create pool. Please try again.', { id: loadingToast });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="glass-card p-6 w-full max-w-lg mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
          <Plus className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create Liquidity Pool</h2>
          <p className="text-sm text-gray-400">Create a pool for your hooked token</p>
        </div>
      </div>

      {!connected ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect your wallet to create pools</p>
          <Button className="glass-button text-white">Connect Wallet</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" className="text-white">Select Token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger className="glass-input">
                <SelectValue placeholder="Choose a token" />
              </SelectTrigger>
              <SelectContent>
                {tokensLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading tokens...
                  </SelectItem>
                ) : tokens.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No tokens found. Create one first.
                  </SelectItem>
                ) : (
                  tokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol} - {token.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenAmount" className="text-white">Token Amount</Label>
            <Input
              id="tokenAmount"
              type="number"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              placeholder="1000"
              min="0"
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="solAmount" className="text-white">SOL Amount</Label>
            <Input
              id="solAmount"
              type="number"
              value={solAmount}
              onChange={(e) => setSolAmount(e.target.value)}
              placeholder="1.0"
              min="0"
              step="0.001"
              className="glass-input"
            />
            <p className="text-xs text-gray-400">
              This will be the initial liquidity for your pool
            </p>
          </div>

          <Button
            onClick={createPool}
            disabled={isCreating || !selectedToken || !tokenAmount || !solAmount}
            className="w-full glass-button text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Pool...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Pool
              </>
            )}
          </Button>

          {createdPool && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Pool Created Successfully!</span>
              </div>
              <p className="text-sm text-green-300 mt-2">
                Pool Address: {createdPool.toString()}
              </p>
              <p className="text-xs text-green-400 mt-1">
                Your pool is now ready for trading. Users can swap tokens and add liquidity.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="font-medium text-blue-400 mb-2">How Pools Work</h3>
            <p className="text-sm text-blue-300">
              Liquidity pools enable automated trading between tokens. When you create a pool, 
              you provide initial liquidity that determines the exchange rate. Other users can 
              then swap tokens or add more liquidity to earn fees.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}