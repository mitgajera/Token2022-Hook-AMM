'use client';
import React, { useState } from 'react';
import { usePrograms } from '@/lib/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export default function Swap() {
  const { ammProgram } = usePrograms();
  const { publicKey } = useWallet();
  const [poolMint, setPoolMint] = useState('');
  const [amount, setAmount] = useState('0');
  const [msg, setMsg] = useState('');

  const doSwap = async () => {
    if (!ammProgram || !publicKey) return;
    try {
      const pool = new PublicKey(poolMint);
      const tx = await ammProgram.methods
        .swap(new (await import('@coral-xyz/anchor')).BN(Number(amount)))
        .accounts({
          user: publicKey,
          pool,
        })
        .rpc();
      setMsg('Swap tx: ' + tx);
    } catch (e: unknown) {
      setMsg('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">Swap</h3>
      <input placeholder="Pool PDA" className="w-full mb-2 border px-2 py-1" value={poolMint} onChange={e => setPoolMint(e.target.value)} />
      <input placeholder="Amount (raw units)" className="w-full mb-2 border px-2 py-1" value={amount} onChange={e => setAmount(e.target.value)} />
      <button onClick={doSwap} className="px-3 py-2 bg-pink-600 text-white rounded">Swap</button>
      {msg && <div className="mt-2 text-sm">{msg}</div>}
    </div>
  );
}
