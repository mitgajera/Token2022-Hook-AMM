'use client';

import { TrendingUp, Clock, Zap } from 'lucide-react';
import { SwapStatsType } from '@/types/swap';

interface SwapStatsProps {
  stats: SwapStatsType;
}

export function SwapStats({ stats }: SwapStatsProps) {
  return (
    <div className="glass-card p-4 rounded-lg space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400 flex items-center space-x-1">
          <TrendingUp className="w-3 h-3" />
          <span>Rate</span>
        </span>
        <span className="text-sm font-medium text-white">
          1 {stats.tokenA} = {stats.exchangeRate} {stats.tokenB}
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400 flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>Fee</span>
        </span>
        <span className="text-sm font-medium text-white">
          {stats.fee}% (${stats.feeUSD})
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Price Impact</span>
        <span className={`text-sm font-medium ${stats.priceImpact > 5 ? 'text-red-400' : 'text-green-400'}`}>
          {stats.priceImpact}%
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Minimum Received</span>
        <span className="text-sm font-medium text-white">
          {stats.minimumReceived} {stats.tokenB}
        </span>
      </div>
    </div>
  );
}