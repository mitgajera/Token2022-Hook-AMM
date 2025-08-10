'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';

export function useWalletEvents() {
  const { wallet, connected, connecting, disconnecting, publicKey } = useWallet();
  
  useEffect(() => {
    if (connecting) {
      const toastId = toast.loading('Connecting wallet...');
      return () => toast.dismiss(toastId);
    }
  }, [connecting]);
  
  useEffect(() => {
    if (connected && publicKey) {
      toast.success(`Connected: ${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`);
    }
  }, [connected, publicKey]);
  
  useEffect(() => {
    if (disconnecting) {
      toast.success('Wallet disconnected');
    }
  }, [disconnecting]);
  
  return { wallet, connected, connecting, disconnecting };
}