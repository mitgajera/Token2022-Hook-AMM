'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Waves } from 'lucide-react';

export function Header() {
  return (
    <header className="relative z-10 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 glass-card animate-glow">
            <Waves className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">HookSwap</h1>
            <p className="text-sm text-gray-400">Solana AMM with Transfer Hooks</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-purple-500 hover:!from-purple-700 hover:!to-purple-600 !transition-all !duration-300 !rounded-lg !font-medium" />
        </div>
      </div>
    </header>
  );
}