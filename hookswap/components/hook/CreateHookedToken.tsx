'use client';

import { useState } from 'react';
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  ExtensionType,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAnchorPrograms } from '@/hooks/useAnchorPrograms';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { HOOK_PROGRAM_ID } from '@/lib/anchor';

export function CreateHookedToken() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { hookProgram } = useAnchorPrograms();

  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [decimals, setDecimals] = useState('9');
  const [initialSupply, setInitialSupply] = useState('1000000');
  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<PublicKey | null>(null);
  const [debugInfo, setDebugInfo] = useState('');

  const showDebugInfo = () => {
    const info = {
      connected,
      publicKey: publicKey?.toString() || 'none',
      hookProgram: !!hookProgram,
      connectionEndpoint: (connection as any)?.rpcEndpoint || 'none',
    };
    console.log('Debug info:', info);
    setDebugInfo(JSON.stringify(info, null, 2));
  };

  const createToken = async () => {
    if (!publicKey || !connected || !connection) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenName || !tokenSymbol || !decimals || !initialSupply) {
      toast.error('Please fill all token details');
      return;
    }

    setIsCreating(true);
    const loadingId = toast.loading('Creating hooked token...');

    try {
      // Generate new mint keypair
      const mintKeypair = Keypair.generate();
      const decimalsNum = parseInt(decimals, 10);
      if (Number.isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 9) {
        throw new Error('Decimals must be an integer between 0 and 9');
      }

      // BigInt-safe supply calculation
      let supply = BigInt(initialSupply);
      for (let i = 0; i < decimalsNum; i++) {
        supply = supply * BigInt(10);
      }

      // Calculate space needed for mint with transfer hook extension
      const mintLen = getMintLen([ExtensionType.TransferHook]);
      const lamports = await connection.getMinimumBalanceForRentExemption(
        mintLen
      );

      console.log('Creating token with:', {
        mint: mintKeypair.publicKey.toString(),
        name: tokenName,
        symbol: tokenSymbol,
        decimals: decimalsNum,
        supply: supply.toString(),
        mintLen,
        lamports,
      });

      // Build transaction
      const tx = new Transaction();

      // 1) Create mint account with enough space
      tx.add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );

      // 2) Initialize transfer hook extension FIRST (per Token-2022 spec)
      tx.add(
        createInitializeTransferHookInstruction(
          mintKeypair.publicKey,
          publicKey, // authority for extension (you can change if needed)
          HOOK_PROGRAM_ID, // hook program to call on transfers
          TOKEN_2022_PROGRAM_ID
        )
      );

      // 3) Initialize the base mint AFTER extensions are initialized
      tx.add(
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimalsNum,
          publicKey, // mint authority
          publicKey, // freeze authority
          TOKEN_2022_PROGRAM_ID
        )
      );

      // 4) Create associated token account for user (use TOKEN_2022 and associated token program ids)
      const userTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      tx.add(
        createAssociatedTokenAccountInstruction(
          publicKey, // payer
          userTokenAccount, // associated token account
          publicKey, // owner
          mintKeypair.publicKey, // mint
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      // 5) Mint initial supply to the user
      tx.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          userTokenAccount,
          publicKey, // mint authority
          supply,
          [], // multiSigners (none)
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Set fee payer & recent blockhash
      tx.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;

      // Partial sign with the mint keypair (extra signer)
      tx.partialSign(mintKeypair);

      // Send transaction
      console.log('Sending transaction...');
      // NOTE: some wallet adapters accept a signers option in sendTransaction; keep it for compatibility.
      const signature = await sendTransaction(tx, connection, {
        signers: [mintKeypair],
        preflightCommitment: 'confirmed',
      } as any);

      console.log('Transaction sent, signature:', signature);

      // Confirm transaction using the same blockhash/lastValidBlockHeight
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction confirmed but failed: ${JSON.stringify(
            confirmation.value.err
          )}`
        );
      }

      console.log('Token created successfully:', mintKeypair.publicKey.toString());

      // Save locally for convenience
      const tokensString = localStorage.getItem('hookedTokens') || '[]';
      const tokens = JSON.parse(tokensString);
      tokens.push({
        mint: mintKeypair.publicKey.toString(),
        name: tokenName,
        symbol: tokenSymbol,
        decimals: decimalsNum,
        supply: supply.toString(),
        createdAt: Date.now(),
      });
      localStorage.setItem('hookedTokens', JSON.stringify(tokens));

      toast.success('Token created successfully!', { id: loadingId });
      setCreatedToken(mintKeypair.publicKey);
    } catch (err: any) {
      console.error('Error creating hooked token:', err);

      let errorMessage = 'Failed to create hooked token.';
      if (err instanceof Error) {
        const m = err.message || '';
        if (m.includes('insufficient funds') || m.includes('lamports')) {
          errorMessage =
            'Insufficient SOL balance. Please ensure you have enough SOL for transaction fees.';
        } else if (
          m.includes('InvalidAccountData') ||
          m.includes('AccountNotRentExempt')
        ) {
          errorMessage =
            'Invalid account data or rent-exemption error. Check initialization order and mint account space.';
        } else if (m.includes('User rejected') || m.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by the user.';
        } else {
          errorMessage = `Error: ${m}`;
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      toast.error(errorMessage, { id: loadingId });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="glass-card p-6 w-full max-w-lg mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create Hooked Token</h2>
          <p className="text-sm text-gray-400">Create a Token-2022 with transfer hooks</p>
        </div>
      </div>

      {!connected ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect your wallet to create hooked tokens</p>
          <div className="flex flex-col gap-3 items-center">
            <WalletMultiButton className="glass-button text-white" />
            <Button variant="outline" onClick={showDebugInfo} size="sm">
              Debug Connection
            </Button>
            {debugInfo && (
              <pre className="mt-4 p-2 bg-gray-800 text-xs text-gray-300 rounded overflow-auto max-h-40">
                {debugInfo}
              </pre>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tokenName" className="text-white">Token Name</Label>
            <Input
              id="tokenName"
              placeholder="My Awesome Token"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenSymbol" className="text-white">Token Symbol</Label>
            <Input
              id="tokenSymbol"
              placeholder="MAT"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decimals" className="text-white">Decimals</Label>
            <Input
              id="decimals"
              type="number"
              min="0"
              max="9"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialSupply" className="text-white">Initial Supply</Label>
            <Input
              id="initialSupply"
              type="number"
              min="1"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
              className="glass-input"
            />
          </div>

          <Button
            onClick={createToken}
            disabled={isCreating}
            className="w-full glass-button text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Token...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Create Hooked Token
              </>
            )}
          </Button>

          {createdToken && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Token Created Successfully!</span>
              </div>
              <p className="text-sm text-green-300 mt-2 break-all">
                Token Address: {createdToken.toString()}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
