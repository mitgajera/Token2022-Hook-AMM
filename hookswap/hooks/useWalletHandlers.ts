'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';

export function useWalletHandlers() {
  const { wallet, connected, connecting, disconnecting, publicKey } = useWallet();
  
  useEffect(() => {
    if (connecting) {
      toast.loading('Connecting wallet...');
    } else if (connected && publicKey) {
      toast.dismiss();
      toast.success(`Connected: ${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`);
    } else if (disconnecting) {
      toast.dismiss();
      toast.success('Wallet disconnected');
    }
  }, [connecting, connected, disconnecting, publicKey]);
  
  return { wallet, connected, connecting, disconnecting };
}