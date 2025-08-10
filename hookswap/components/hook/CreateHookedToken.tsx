'use client';

import { useState } from 'react';
import { PublicKey, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { 
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  ExtensionType,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAnchorPrograms } from '@/hooks/useAnchorPrograms';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { HOOK_PROGRAM_ID } from '@/lib/anchor';

export function CreateHookedToken() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { hookProgram, connected } = useAnchorPrograms();
  
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [decimals, setDecimals] = useState('9');
  const [initialSupply, setInitialSupply] = useState('1000000');
  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<PublicKey | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Debug function to show current state
  const showDebugInfo = () => {
    const info = {
      connected,
      publicKey: publicKey?.toString(),
      hookProgram: !!hookProgram,
      connection: !!connection,
      network: connection?.rpcEndpoint,
      localStorage: localStorage.getItem('hookedTokens')
    };
    setDebugInfo(JSON.stringify(info, null, 2));
  };

  const createHookedToken = async () => {
    if (!connected || !publicKey || !hookProgram) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenName || !tokenSymbol) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (tokenName.length < 1 || tokenName.length > 32) {
      toast.error('Token name must be between 1 and 32 characters');
      return;
    }

    if (tokenSymbol.length < 1 || tokenSymbol.length > 10) {
      toast.error('Token symbol must be between 1 and 10 characters');
      return;
    }

    if (parseFloat(initialSupply) <= 0) {
      toast.error('Initial supply must be greater than 0');
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

      console.log('Creating token with:', {
        mint: mintKeypair.publicKey.toString(),
        name: tokenName,
        symbol: tokenSymbol,
        decimals: decimalsNum,
        supply: supply.toString(),
        lamports,
        mintLen
      });

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
        HOOK_PROGRAM_ID, // hook program
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

      // Get associated token account for the user
      const userTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Create associated token account instruction
      const createAtaInstruction = createAssociatedTokenAccountInstruction(
        publicKey,
        userTokenAccount,
        publicKey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      );

      // Mint initial supply to user
      const mintToInstruction = createMintToInstruction(
        mintKeypair.publicKey,
        userTokenAccount,
        publicKey,
        supply,
        [],
        TOKEN_2022_PROGRAM_ID
      );

      // Create and send transaction
      const transaction = new Transaction().add(
        createAccountInstruction,
        initializeTransferHookInstruction,
        initializeMintInstruction,
        createAtaInstruction,
        mintToInstruction
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      transaction.sign(mintKeypair);

      console.log('Transaction prepared, sending...');

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent:', signature);
      
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmed');

      // Store token metadata locally for display purposes
      const tokenInfo = {
        mint: mintKeypair.publicKey.toString(),
        name: tokenName,
        symbol: tokenSymbol,
        decimals: decimalsNum,
        supply: initialSupply,
        timestamp: Date.now()
      };

      // Store in localStorage for the app to use
      try {
        const existingTokens = JSON.parse(localStorage.getItem('hookedTokens') || '[]');
        existingTokens.push(tokenInfo);
        localStorage.setItem('hookedTokens', JSON.stringify(existingTokens));
        console.log('Token metadata stored locally');
      } catch (error) {
        console.error('Error storing token metadata:', error);
      }

      toast.success('Hooked token created successfully!', { id: loadingToast });
      setCreatedToken(mintKeypair.publicKey);
      
      // Reset form
      setTokenName('');
      setTokenSymbol('');
      setDecimals('9');
      setInitialSupply('1000000');

    } catch (error) {
      console.error('Error creating hooked token:', error);
      let errorMessage = 'Failed to create hooked token. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient SOL balance. Please ensure you have enough SOL for transaction fees.';
        } else if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected by the user.';
        } else if (error.message.includes('blockhash')) {
          errorMessage = 'Network error. Please try again.';
        }
      }
      
      toast.error(errorMessage, { id: loadingToast });
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
          <Button className="glass-button text-white">Connect Wallet</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tokenName" className="text-white">Token Name</Label>
            <Input
              id="tokenName"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="My Awesome Token"
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenSymbol" className="text-white">Token Symbol</Label>
            <Input
              id="tokenSymbol"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              placeholder="MAT"
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decimals" className="text-white">Decimals</Label>
            <Input
              id="decimals"
              type="number"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              min="0"
              max="9"
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialSupply" className="text-white">Initial Supply</Label>
            <Input
              id="initialSupply"
              type="number"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
              min="1"
              className="glass-input"
            />
          </div>

          <Button
            onClick={createHookedToken}
            disabled={isCreating || !tokenName || !tokenSymbol}
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

          {/* Debug Button */}
          <Button
            onClick={showDebugInfo}
            variant="outline"
            className="w-full text-gray-400 border-gray-600 hover:bg-gray-700"
          >
            Debug Info
          </Button>

          {debugInfo && (
            <div className="mt-4 p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Debug Information:</h4>
              <pre className="text-xs text-gray-400 overflow-auto max-h-32">
                {debugInfo}
              </pre>
            </div>
          )}

          {createdToken && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Token Created Successfully!</span>
              </div>
              <p className="text-sm text-green-300 mt-2">
                Mint Address: {createdToken.toString()}
              </p>
              <p className="text-xs text-green-400 mt-1">
                This token now has transfer hooks enabled and can be used in the AMM.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="font-medium text-blue-400 mb-2">What are Transfer Hooks?</h3>
            <p className="text-sm text-blue-300">
              Transfer hooks allow you to add custom logic to token transfers, such as KYC validation, 
              transfer limits, or compliance checks. This makes your tokens programmable and compliant 
              with regulatory requirements.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}