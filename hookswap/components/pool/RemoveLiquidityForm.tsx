'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'react-hot-toast';

interface RemoveLiquidityFormProps {
  onRemoveLiquidity: (percentage: number) => Promise<void>;
  isLoading: boolean;
  connected: boolean;
  lpBalance: string;
}

export function RemoveLiquidityForm({ 
  onRemoveLiquidity, 
  isLoading, 
  connected, 
  lpBalance 
}: RemoveLiquidityFormProps) {
  const [percentage, setPercentage] = useState([50]);

  const handleRemoveLiquidity = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (parseFloat(lpBalance) === 0) {
      toast.error('No liquidity to remove');
      return;
    }

    try {
      await onRemoveLiquidity(percentage[0]);
    } catch (error) {
      toast.error('Failed to remove liquidity');
      console.error('Remove liquidity error:', error);
    }
  };

  const presetPercentages = [25, 50, 75, 100];

  return (
    <div className="space-y-6">
      {/* LP Balance */}
      <div className="glass-card p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Your LP Balance</span>
          <span className="font-medium text-white">{lpBalance} LP</span>
        </div>
      </div>

      {/* Percentage Selector */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Amount to Remove</span>
          <span className="font-medium text-purple-400">{percentage[0]}%</span>
        </div>
        
        <div className="glass-card p-4 rounded-lg space-y-4">
          <Slider
            value={percentage}
            onValueChange={setPercentage}
            max={100}
            min={1}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between space-x-2">
            {presetPercentages.map((preset) => (
              <Button
                key={preset}
                variant="ghost"
                size="sm"
                onClick={() => setPercentage([preset])}
                className={`flex-1 glass-button text-xs ${
                  percentage[0] === preset 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500' 
                    : ''
                }`}
              >
                {preset}%
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Estimated Output */}
      <div className="glass-card p-4 rounded-lg space-y-2">
        <h4 className="text-sm font-medium text-gray-400">You will receive</h4>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Token A</span>
            <span className="text-sm font-medium text-white">
              {((parseFloat(lpBalance) * percentage[0]) / 100 * 0.5).toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Token B</span>
            <span className="text-sm font-medium text-white">
              {((parseFloat(lpBalance) * percentage[0]) / 100 * 0.5).toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Remove Liquidity Button */}
      <Button
        onClick={handleRemoveLiquidity}
        disabled={parseFloat(lpBalance) === 0 || isLoading}
        className="w-full glass-button text-white font-semibold py-3 text-lg hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Removing Liquidity...</span>
          </div>
        ) : connected ? (
          'Remove Liquidity'
        ) : (
          'Connect Wallet to Remove Liquidity'
        )}
      </Button>
    </div>
  );
}