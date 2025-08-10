'use client';

import { useState } from 'react';
import { WalletButton } from '@/components/wallet/WalletButton';
import { CreateHookedToken } from '@/components/hook/CreateHookedToken';
import { CreatePool } from '@/components/pool/CreatePool';
import { SwapCard } from '@/components/swap/SwapCard';
import { PoolCard } from '@/components/pool/PoolCard';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState('swap');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runTests = () => {
    const results: Record<string, boolean> = {};
    
    // Test 1: Wallet connection
    results.walletConnected = connected;
    
    // Test 2: Public key available
    results.publicKeyAvailable = !!publicKey;
    
    // Test 3: Local storage accessible
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      results.localStorageAccessible = true;
    } catch {
      results.localStorageAccessible = false;
    }
    
    // Test 4: Console accessible
    try {
      console.log('Test log');
      results.consoleAccessible = true;
    } catch {
      results.consoleAccessible = false;
    }
    
    setTestResults(results);
  };

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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">HookSwap</h1>
              <span className="ml-2 px-2 py-1 text-xs bg-purple-600 text-white rounded-full">
                Token-2022 AMM
              </span>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Test Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Card className="p-4 bg-gray-800/50 border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">System Test</h2>
            <Button onClick={runTests} variant="outline" size="sm">
              Run Tests
            </Button>
          </div>
          
          {Object.keys(testResults).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(testResults).map(([test, passed]) => (
                <div key={test} className="flex items-center space-x-2">
                  {passed ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300 capitalize">
                    {test.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {Object.keys(testResults).length === 0 && (
            <div className="flex items-center space-x-2 text-gray-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Click "Run Tests" to verify system functionality</span>
            </div>
          )}
        </Card>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </main>
    </div>
  );
}