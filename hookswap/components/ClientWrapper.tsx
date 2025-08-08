'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

// Dynamically import components to ensure they only render client-side
const MintHookToken = dynamic(() => import('@/components/MintHookToken'), { ssr: false });
const CreatePool = dynamic(() => import('@/components/CreatePool'), { ssr: false });
const AddLiquidity = dynamic(() => import('@/components/AddLiquidity'), { ssr: false });
const Swap = dynamic(() => import('@/components/Swap'), { ssr: false });
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
);

export function ClientSideComponents() {
  // Prevent hydration mismatch with mounted check
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set up wallet configuration
  const network = WalletAdapterNetwork.Devnet;
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
  ];
  const endpoint = process.env.NEXT_PUBLIC_CLUSTER || 'https://api.devnet.solana.com';

  // Don't render anything until client-side
  if (!mounted) {
    return <div className="min-h-screen bg-gray-100 p-8">Loading wallet...</div>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">HookSwap</h1>
              <WalletMultiButton />
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MintHookToken />
              <CreatePool />
              <AddLiquidity />
              <Swap />
            </section>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}