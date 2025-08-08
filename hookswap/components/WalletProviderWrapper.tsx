'use client';

import { WalletContextProvider } from '@/context/Wallet';
import { ReactNode } from 'react';

export function WalletProviderWrapper({ children }: { children: ReactNode }) {
  return <WalletContextProvider>{children}</WalletContextProvider>;
}