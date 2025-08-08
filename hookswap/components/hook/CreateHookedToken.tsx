'use client';

import { useState } from 'react';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { 
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  ExtensionType,
} from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAnchorPrograms } from '@/hooks/useAnchorPrograms';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export function CreateHookedToken() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { hookProgram, connected } = useAnchorPrograms();
  
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [decimals, setDecimals] = useState('9');
  const [initialSupply, setInitialSupply] = useState('1000000');
  const [isCreating, setIsCreating] = useState(false);

  const createHookedToken = async () => {
    if (!connected || !publicKey || !hookProgram) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenName || !tokenSymbol) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    const loadingToast = toast.loading('Creating hooked token...');

    try {
      // Generate new mint keypair
      const mintKeypair = Keypair.generate();
      const decimalsNum = parseInt(decimals);
      const supply = BigInt(parseInt(initialSupply) * Math.pow(10, decimalsNum));

      // Calculate space needed for mint with transfer hook extension
      const mintLen = getMintLen([ExtensionType.TransferHook]);
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

      // Create mint account instruction
      const createAccountInstruction = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      });

      // Initialize transfer hook extension
      const initializeTransferHookInstruction = createInitializeTransferHookInstruction(
        mintKeypair.publicKey,
        publicKey, // authority
        hookProgram.programId, // hook program
        TOKEN_2022_PROGRAM_ID
      );

      // Initialize mint instruction
      const initializeMintInstruction = createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimalsNum,
        publicKey, // mint authority
        publicKey, // freeze authority
        TOKEN_2022_PROGRAM_ID
      );

      // Call your hook program's initialize method
      const initializeHookTx = await hookProgram.methods
        .initializeHook({
          name: tokenName,
          symbol: tokenSymbol,
          decimals: decimalsNum,
          initialSupply: supply,
        })
        .accounts({
          mint: mintKeypair.publicKey,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .preInstructions([
          createAccountInstruction,
          initializeTransferHookInstruction,
          initializeMintInstruction,
        ])
        .transaction();

      // Send transaction
      const signature = await sendTransaction(initializeHookTx, connection, {
        signers: [mintKeypair],
      });

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      toast.dismiss(loadingToast);
      toast.success(`Token created successfully! Mint: ${mintKeypair.publicKey.toString()}`);
      
      // Reset form
      setTokenName('');
      setTokenSymbol('');
      setDecimals('9');
      setInitialSupply('1000000');

    } catch (error) {
      console.error('Create hooked token error:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to create hooked token');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="glass-card p-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <span>Create Hooked Token</span>
        </h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenName" className="text-sm text-gray-400">
            Token Name *
          </Label>
          <Input
            id="tokenName"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="My Awesome Token"
            className="input-glass"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenSymbol" className="text-sm text-gray-400">
            Token Symbol *
          </Label>
          <Input
            id="tokenSymbol"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
            placeholder="MAT"
            className="input-glass"
            maxLength={10}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="decimals" className="text-sm text-gray-400">
              Decimals
            </Label>
            <Input
              id="decimals"
              type="number"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              min="0"
              max="18"
              className="input-glass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialSupply" className="text-sm text-gray-400">
              Initial Supply
            </Label>
            <Input
              id="initialSupply"
              type="number"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
              min="1"
              className="input-glass"
            />
          </div>
        </div>

        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-start space-x-2">
            <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-400">
              This will create a Token-2022 mint with transfer hooks enabled. 
              The hook program will be called on every transfer, enabling advanced 
              features like fees, restrictions, or custom logic.
            </div>
          </div>
        </div>

        <Button
          onClick={createHookedToken}
          disabled={!connected || !tokenName || !tokenSymbol || isCreating}
          className="w-full glass-button text-white font-semibold py-3 text-lg hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Token...</span>
            </div>
          ) : connected ? (
            'Create Hooked Token'
          ) : (
            'Connect Wallet to Create Token'
          )}
        </Button>
      </div>
    </Card>
  );
}