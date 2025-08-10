'use client';

import { useState } from 'react';
import { WalletButton } from '@/components/wallet/WalletButton';
import { CreateHookedToken } from '@/components/hook/CreateHookedToken';
import { CreatePool } from '@/components/pool/CreatePool';
import { SwapCard } from '@/components/swap/SwapCard';
import { PoolCard } from '@/components/pool/PoolCard';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Home() {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState('swap');

  const tabs = [
    { id: 'swap', label: 'Swap', component: <SwapCard /> },
    { id: 'pool', label: 'Pool', component: <PoolCard /> },
    { id: 'create-token', label: 'Create Token', component: <CreateHookedToken /> },
    { id: 'create-pool', label: 'Create Pool', component: <CreatePool /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              {/* Logo with wavy lines */}
              <div className="flex flex-col space-y-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-6 bg-purple-400 rounded-full"></div>
                  <div className="w-2 h-8 bg-purple-400 rounded-full"></div>
                  <div className="w-2 h-6 bg-purple-400 rounded-full"></div>
                </div>
              </div>
              
              {/* Title and subtitle */}
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-white">HookSwap</h1>
                <span className="text-sm text-gray-300">Solana AMM with Transfer Hooks</span>
              </div>
            </div>
            
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex space-x-1 bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-8 py-4 rounded-lg text-sm font-semibold transition-all duration-200 flex-1 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-white bg-transparent hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </main>
    </div>
  );
}