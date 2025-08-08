'use client';
import React, { useState } from 'react';
import { usePrograms } from '@/lib/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export default function AddLiquidity() {
  const { ammProgram } = usePrograms();
  const { publicKey } = useWallet();
  const [mint, setMint] = useState('');
  const [amount, setAmount] = useState('0');
  const [msg, setMsg] = useState('');

  const add = async () => {
    if (!ammProgram || !publicKey) return;
    try {
      const mintPub = new PublicKey(mint);
      // derive pool PDA logic same as program
      const [poolPda] = PublicKey.findProgramAddressSync([Buffer.from('pool'), mintPub.toBuffer()], ammProgram.programId);
      const tx = await ammProgram.methods
        .addLiquidity(new (await import('@coral-xyz/anchor')).BN(Number(amount)))
        .accounts({
          payer: publicKey,
          pool: poolPda,
          // add other required accounts: user token account, vaults etc.
        })
        .rpc();
      setMsg('Liquidity added tx: ' + tx);
    } catch (e: unknown) {
      setMsg('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">Add Liquidity</h3>
      <input placeholder="Pool Mint (example) " value={mint} onChange={e => setMint(e.target.value)} className="w-full mb-2 border px-2 py-1" />
      <input placeholder="Amount (raw units)" value={amount} onChange={e => setAmount(e.target.value)} className="w-full mb-2 border px-2 py-1" />
      <button onClick={add} className="px-3 py-2 bg-indigo-600 text-white rounded">Add Liquidity</button>
      {msg && <div className="mt-2 text-sm">{msg}</div>}
    </div>
  );
}
