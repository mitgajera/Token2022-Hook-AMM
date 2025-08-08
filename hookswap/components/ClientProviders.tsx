'use client';

import { ReactNode } from 'react';
import { WalletContextProvider } from '@/context/WalletProvider';

export function ClientProviders({ children }: { children: ReactNode }) {
  return <WalletContextProvider>{children}</WalletContextProvider>;
}