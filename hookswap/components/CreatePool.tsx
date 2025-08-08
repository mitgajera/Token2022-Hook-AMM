'use client';
import React, { useState } from 'react';
import { usePrograms } from '@/lib/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export default function CreatePool() {
  const { ammProgram } = usePrograms();
  const { publicKey } = useWallet();
  const [mintA, setMintA] = useState('');
  const [mintB, setMintB] = useState('');
  const [msg, setMsg] = useState('');

  const handleCreate = async () => {
    if (!ammProgram || !publicKey) {
      alert('Connect wallet and programs');
      return;
    }
    try {
      const mintAPub = new PublicKey(mintA);
      const mintBPub = new PublicKey(mintB);

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), mintAPub.toBuffer(), mintBPub.toBuffer()],
        ammProgram.programId
      );

      const tx = await ammProgram.methods
        .initializePool()
        .accounts({
          payer: publicKey,
          pool: poolPda,
          mintA: mintAPub,
          mintB: mintBPub,
          systemProgram: (await import('@solana/web3.js')).SystemProgram.programId,
        })
        .rpc();
      setMsg('Pool created: ' + poolPda.toBase58() + ' tx:' + tx);
    } catch (e: unknown) {
      console.error(e);
      setMsg('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">Create AMM Pool</h3>
      <input className="w-full mb-2 border px-2 py-1" placeholder="Mint A address" value={mintA} onChange={(e) => setMintA(e.target.value)} />
      <input className="w-full mb-2 border px-2 py-1" placeholder="Mint B address" value={mintB} onChange={(e) => setMintB(e.target.value)} />
      <button onClick={handleCreate} className="px-3 py-2 bg-green-600 text-white rounded">Create Pool</button>
      {msg && <div className="mt-2 text-sm">{msg}</div>}
    </div>
  );
}
