'use client';

import { useState } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAnchorPrograms } from '@/hooks/useAnchorPrograms';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getPoolPda, getVaultPda, getLpMintPda } from '@/lib/anchor';

export function CreatePool() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { ammProgram, connected } = useAnchorPrograms();
  
  const [tokenAMint, setTokenAMint] = useState('');
  const [tokenBMint, setTokenBMint] = useState('');
  const [initialTokenAAmount, setInitialTokenAAmount] = useState('');
  const [initialTokenBAmount, setInitialTokenBAmount] = useState('');
  const [fee, setFee] = useState('0.3'); // 0.3% default fee
  const [isCreating, setIsCreating] = useState(false);

  const createPool = async () => {
    if (!connected || !publicKey || !ammProgram) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenAMint || !tokenBMint || !initialTokenAAmount || !initialTokenBAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const tokenAMintPk = new PublicKey(tokenAMint);
      const tokenBMintPk = new PublicKey(tokenBMint);
    } catch {
      toast.error('Invalid mint addresses');
      return;
    }

    setIsCreating(true);
    const loadingToast = toast.loading('Creating pool...');

    try {
      const tokenAMintPk = new PublicKey(tokenAMint);
      const tokenBMintPk = new PublicKey(tokenBMint);
      
      // Derive PDAs
      const [poolPda] = getPoolPda(tokenAMintPk, tokenBMintPk);
      const [tokenAVault] = getVaultPda(poolPda, tokenAMintPk);
      const [tokenBVault] = getVaultPda(poolPda, tokenBMintPk);
      const [lpMint] = getLpMintPda(poolPda);

      // Get user token accounts
      const userTokenAAccount = await getAssociatedTokenAddress(tokenAMintPk, publicKey);
      const userTokenBAccount = await getAssociatedTokenAddress(tokenBMintPk, publicKey);
      const userLpAccount = await getAssociatedTokenAddress(lpMint, publicKey);

      // Convert amounts to proper decimals (assuming 9 decimals for now)
      const tokenAAmount = BigInt(parseFloat(initialTokenAAmount) * Math.pow(10, 9));
      const tokenBAmount = BigInt(parseFloat(initialTokenBAmount) * Math.pow(10, 9));
      const feeNum = Math.floor(parseFloat(fee) * 100); // Convert to basis points

      // Create pool transaction
      const tx = await ammProgram.methods
        .initializePool({
          tokenAAmount,
          tokenBAmount,
          fee: feeNum,
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
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      // Send transaction
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      toast.dismiss(loadingToast);
      toast.success('Pool created successfully!');
      
      // Reset form
      setTokenAMint('');
      setTokenBMint('');
      setInitialTokenAAmount('');
      setInitialTokenBAmount('');
      setFee('0.3');

    } catch (error) {
      console.error('Create pool error:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to create pool');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="glass-card p-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Plus className="w-5 h-5 text-purple-400" />
          <span>Create Pool</span>
        </h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenAMint" className="text-sm text-gray-400">
            Token A Mint Address *
          </Label>
          <Input
            id="tokenAMint"
            value={tokenAMint}
            onChange={(e) => setTokenAMint(e.target.value)}
            placeholder="Enter Token A mint address"
            className="input-glass font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenBMint" className="text-sm text-gray-400">
            Token B Mint Address *
          </Label>
          <Input
            id="tokenBMint"
            value={tokenBMint}
            onChange={(e) => setTokenBMint(e.target.value)}
            placeholder="Enter Token B mint address"
            className="input-glass font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tokenAAmount" className="text-sm text-gray-400">
              Initial Token A Amount *
            </Label>
            <Input
              id="tokenAAmount"
              type="number"
              value={initialTokenAAmount}
              onChange={(e) => setInitialTokenAAmount(e.target.value)}
              placeholder="1000"
              className="input-glass"
              min="0"
              step="0.000001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenBAmount" className="text-sm text-gray-400">
              Initial Token B Amount *
            </Label>
            <Input
              id="tokenBAmount"
              type="number"
              value={initialTokenBAmount}
              onChange={(e) => setInitialTokenBAmount(e.target.value)}
              placeholder="1000"
              className="input-glass"
              min="0"
              step="0.000001"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fee" className="text-sm text-gray-400">
            Pool Fee (%)
          </Label>
          <Input
            id="fee"
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0.3"
            className="input-glass"
            min="0"
            max="10"
            step="0.1"
          />
        </div>

        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-start space-x-2">
            <Plus className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-400">
              Creating a pool will initialize the AMM with your specified token pair and initial liquidity. 
              You'll receive LP tokens representing your share of the pool.
            </div>
          </div>
        </div>

        <Button
          onClick={createPool}
          disabled={!connected || !tokenAMint || !tokenBMint || !initialTokenAAmount || !initialTokenBAmount || isCreating}
          className="w-full glass-button text-white font-semibold py-3 text-lg hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Pool...</span>
            </div>
          ) : connected ? (
            'Create Pool'
          ) : (
            'Connect Wallet to Create Pool'
          )}
        </Button>
      </div>
    </Card>
  );
}