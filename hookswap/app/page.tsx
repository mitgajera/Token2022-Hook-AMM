'use client';

import { useState } from 'react';
import { WalletButton } from '@/components/wallet/WalletButton';
import { CreateHookedToken } from '@/components/hook/CreateHookedToken';
import { CreatePool } from '@/components/pool/CreatePool';
import { SwapCard } from '@/components/swap/SwapCard';
import { PoolCard } from '@/components/pool/PoolCard';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/Header';


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

    <div className="min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl animate-pulse-slow delay-2000" />
      </div>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative container mx-auto px-14 pb-12">
        <div className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
          <div className="flex justify-center mb-10">
            <div className="glass-card p-1 rounded-xl">
              <div className="flex space-x-1 flex-wrap">
                <button
                  onClick={() => setActiveTab('swap')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                    activeTab === 'swap'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Swap</span>
                </button>
                <button
                  onClick={() => setActiveTab('pool')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                    activeTab === 'pool'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Pool</span>
                </button>
                <button
                  onClick={() => setActiveTab('create-token')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                    activeTab === 'create-token'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Create Token</span>
                </button>
                <button
                  onClick={() => setActiveTab('create-pool')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                    activeTab === 'create-pool'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Create Pool</span>
                </button>
              </div>
            </div>
          </div>

        {/* Tab Content */}
          <div className="flex justify-center">
            {activeTab === 'swap' && <SwapCard />}
            {activeTab === 'pool' && <PoolCard />}
            {activeTab === 'create-token' && <CreateHookedToken />}
            {activeTab === 'create-pool' && <CreatePool />}
          </div>
          </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-gray-400 text-sm">
        <div className="max-w-4xl mx-auto px-4">
          <p className="mb-2">HookSwap - Advanced AMM on Solana with Token-2022 Transfer Hook Support</p>
          <p className="text-xs text-gray-500">
            Built with modern web technologies. Connect your Solana wallet to start trading.
          </p>
        </div>
      </footer>
    </div>
  );
}