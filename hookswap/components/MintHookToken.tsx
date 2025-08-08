'use client';

import React, { useState } from 'react';
import { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { 
  TOKEN_2022_PROGRAM_ID, 
  createInitializeMintInstruction, 
  getMintLen, 
  ExtensionType,
  createInitializeTransferHookInstruction
} from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { usePrograms } from '@/lib/solana';

export default function MintHookToken() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { hookProgram } = usePrograms();
  const [mint, setMint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleMint = async () => {
    if (!publicKey || !signTransaction) {
      alert('Connect wallet first');
      return;
    }

    if (!hookProgram) {
      alert('Hook program not ready');
      return;
    }
    
    setLoading(true);
    setStatus('Preparing transaction...');

    try {
      // Generate a new keypair for the mint
      const mintKeypair = Keypair.generate();
      const mintPubkey = mintKeypair.publicKey;
      
      // Calculate space needed for mint with transfer hook extension
      const mintLen = getMintLen([ExtensionType.TransferHook]);
      
      // Calculate minimum rent
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

      // Create a transaction
      const transaction = new Transaction();
      
      // Add instruction to create account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintPubkey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID
        })
      );
      
      // The extraData buffer needed for transfer hook - typically the hook's program ID
      // Create a transfer hook instruction
      const [hookPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('hook')], 
        hookProgram.programId
      );

      // Add instruction to initialize transfer hook
      transaction.add(
        createInitializeTransferHookInstruction(
          mintPubkey,
          publicKey,
          hookPda, // The actual hook address
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // Add instruction to initialize mint with 9 decimals, wallet as authority
      transaction.add(
        createInitializeMintInstruction(
          mintPubkey,
          9, // 9 decimals is standard for Solana tokens
          publicKey,
          publicKey, // Freeze authority (optional)
          TOKEN_2022_PROGRAM_ID
        )
      );

      setStatus('Please approve transaction...');
      
      // Sign transaction with both wallet and mint keypair
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      
      transaction.partialSign(mintKeypair);
      const signedTx = await signTransaction(transaction);
      
      setStatus('Sending transaction...');
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      setTxSignature(signature);
      
      setStatus('Confirming transaction...');
      await connection.confirmTransaction(signature, 'confirmed');
      
      setMint(mintPubkey.toString());
      setStatus('Token mint created successfully!');
    } catch (err) {
      console.error('Error creating mint:', err);
      setStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold mb-2">Mint Hook Token</h3>
        <div className="text-center text-gray-500 py-4">
          Please connect your wallet
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-3">Mint Token-2022 with Hook</h2>
      <p className="text-gray-600 mb-4">
        Create a Token-2022 mint with a transfer hook that executes your program on token transfers.
      </p>
      
      <button 
        onClick={handleMint} 
        disabled={loading} 
        className={`px-4 py-2 rounded-md font-medium ${
          loading 
            ? 'bg-blue-400 text-white cursor-wait' 
            : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
        }`}
      >
        {loading 
          ? 'Processing...' 
          : 'Mint Hook Token'
        }
      </button>
      
      {status && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <p className="text-sm font-medium text-gray-700">Status:</p>
          <p className="text-sm text-gray-600">{status}</p>
        </div>
      )}
      
      {txSignature && (
        <div className="mt-3">
          <a 
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View transaction on Solana Explorer
          </a>
        </div>
      )}
      
      {mint && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-medium text-green-700">Mint Created:</p>
          <p className="text-sm text-green-600 break-all">{mint}</p>
        </div>
      )}
    </div>
  );
}
