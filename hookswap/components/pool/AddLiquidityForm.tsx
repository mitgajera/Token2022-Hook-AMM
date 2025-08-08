'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { TokenSelector } from '@/components/swap/TokenSelector';
import { SwapInput } from '@/components/swap/SwapInput';
import { Token } from '@/types/token';

interface AddLiquidityFormProps {
  onAddLiquidity: (tokenA: string, tokenB: string, amountA: number, amountB: number) => Promise<void>;
  isLoading: boolean;
  connected: boolean;
}

export function AddLiquidityForm({ onAddLiquidity, isLoading, connected }: AddLiquidityFormProps) {
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');

  const handleAddLiquidity = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenA || !tokenB || !amountA || !amountB) {
      toast.error('Please select tokens and enter amounts');
      return;
    }

    try {
      await onAddLiquidity(tokenA.address, tokenB.address, parseFloat(amountA), parseFloat(amountB));
      setAmountA('');
      setAmountB('');
    } catch (error) {
      toast.error('Failed to add liquidity');
      console.error('Add liquidity error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Token A Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Token A</span>
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

      {/* Token B Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Token B</span>
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
              className="flex-1"
            />
            <TokenSelector
              selectedToken={tokenB}
              onTokenSelect={setTokenB}
            />
          </div>
        </div>
      </div>

      {/* Add Liquidity Button */}
      <Button
        onClick={handleAddLiquidity}
        disabled={!tokenA || !tokenB || !amountA || !amountB || isLoading}
        className="w-full glass-button text-white font-semibold py-3 text-lg hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Adding Liquidity...</span>
          </div>
        ) : connected ? (
          'Add Liquidity'
        ) : (
          'Connect Wallet to Add Liquidity'
        )}
      </Button>
    </div>
  );
}