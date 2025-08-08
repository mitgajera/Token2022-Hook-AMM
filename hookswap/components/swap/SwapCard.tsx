'use client';

import { useEffect } from 'react';
import { ArrowUpDown, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { TokenSelector } from './TokenSelector';
import { SwapInput } from './SwapInput';
import { SwapStats } from './SwapStats';
import { useSwap } from '@/hooks/useSwap';
import { useWallet } from '@solana/wallet-adapter-react';

export function SwapCard() {
  const { connected } = useWallet();
  const {
    tokenA,
    tokenB,
    amountA,
    amountB,
    setTokenA,
    setTokenB,
    setAmountA,
    setAmountB,
    swapTokens,
    swapStats,
    isLoading,
    poolLoading
  } = useSwap();

  const handleSwapTokens = () => {
    const tempToken = tokenA;
    const tempAmount = amountA;
    
    setTokenA(tokenB);
    setTokenB(tempToken);
    setAmountA(amountB);
    setAmountB(tempAmount);
  };

  const handleSwap = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenA || !tokenB || !amountA) {
      toast.error('Please select tokens and enter an amount');
      return;
    }

    if (parseFloat(amountA) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await swapTokens();
    } catch (error) {
      // Error is already handled in the hook
      console.error('Swap error:', error);
    }
  };

  return (
    <Card className="glass-card p-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Swap</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white p-2"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!connected ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect your wallet to access swap features</p>
          <Button className="glass-button text-white">Connect Wallet</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Token A Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">From</span>
              <span className="text-sm text-gray-400">
                Balance: {tokenA?.balance || '0.00'}
              </span>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <SwapInput
                  value={amountA}
                  onChange={setAmountA}
                  placeholder="0.0"
                  className="flex-1"
                />
                <TokenSelector
                  selectedToken={tokenA}
                  onTokenSelect={setTokenA}
                />
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center py-2">
            <button
              onClick={handleSwapTokens}
              className="p-2 glass-button rounded-full hover:scale-110 transition-all duration-300 animate-float"
              aria-label="Swap token positions"
            >
              <ArrowUpDown className="w-5 h-5 text-purple-400" />
            </button>
          </div>

          {/* Token B Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">To</span>
              <span className="text-sm text-gray-400">
                Balance: {tokenB?.balance || '0.00'}
              </span>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <SwapInput
                  value={amountB}
                  onChange={setAmountB}
                  placeholder="0.0"
                  readOnly
                  className="flex-1"
                />
                <TokenSelector
                  selectedToken={tokenB}
                  onTokenSelect={setTokenB}
                />
              </div>
            </div>
          </div>

          {/* Swap Stats */}
          {tokenA && tokenB && amountA && parseFloat(amountA) > 0 && (
            <SwapStats stats={{
              ...swapStats,
              // Format the exchange rate to be more readable
              exchangeRate: `1 ${tokenA.symbol} = ${Number(swapStats.exchangeRate).toFixed(4)} ${tokenB.symbol}`
            }} />
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!tokenA || !tokenB || !amountA || isLoading || poolLoading || parseFloat(amountA) <= 0}
            className="w-full glass-button text-white font-semibold py-3 text-lg hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Swapping...</span>
              </div>
            ) : poolLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Loading pool data...</span>
              </div>
            ) : connected ? (
              'Swap'
            ) : (
              'Connect Wallet to Swap'
            )}
          </Button>

          {/* Info */}
          <div className="flex items-start space-x-2 p-3 glass-card rounded-lg">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-400">
              HookSwap uses advanced routing to find the best prices across all available liquidity pools.
              Transfer hooks ensure secure and compliant token transfers.
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}