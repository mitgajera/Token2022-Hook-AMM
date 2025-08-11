'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Force Devnet
  const network = WalletAdapterNetwork.Devnet;

  // Lock endpoint to Devnet unless an explicit Devnet RPC is provided
  const endpoint = useMemo(() => {
    const custom = process.env.NEXT_PUBLIC_RPC_URL;
    if (custom && /devnet/i.test(custom)) return custom;
    return clusterApiUrl(WalletAdapterNetwork.Devnet);
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new BackpackWalletAdapter(),
    ],
    [network]
  );

  const autoConnect =
    String(process.env.NEXT_PUBLIC_WALLET_AUTOCONNECT || '').toLowerCase() === 'true';

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect={autoConnect}
        onError={(error) => {
          console.error('Wallet error:', error);
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}