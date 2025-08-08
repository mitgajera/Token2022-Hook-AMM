'use client';

import { TrendingUp, DollarSign, Users, Droplets } from 'lucide-react';
import { PoolStatsType } from '@/types/pool';

interface PoolStatsProps {
  stats: PoolStatsType;
}

export function PoolStats({ stats }: PoolStatsProps) {
  const statItems = [
    {
      icon: DollarSign,
      label: 'Total Value Locked',
      value: `$${stats.totalValueLocked}`,
      change: stats.tvlChange,
    },
    {
      icon: Droplets,
      label: 'LP Token Supply',
      value: stats.lpTokenSupply,
      change: null,
    },
    {
      icon: Users,
      label: 'Your Share',
      value: `${stats.userShare}%`,
      change: null,
    },
    {
      icon: TrendingUp,
      label: '24h Volume',
      value: `$${stats.volume24h}`,
      change: stats.volumeChange,
    },
  ];

  return (
    <div className="glass-card p-4 rounded-lg">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Pool Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        {statItems.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center space-x-1">
              <item.icon className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-gray-400">{item.label}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-white">{item.value}</span>
              {item.change && (
                <span className={`text-xs ${item.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change > 0 ? '+' : ''}{item.change}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Token Reserves */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Token Reserves</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">SOL</span>
            <span className="text-sm font-medium text-white">{stats.tokenAReserve}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">USDC</span>
            <span className="text-sm font-medium text-white">{stats.tokenBReserve}</span>
          </div>
        </div>
      </div>
    </div>
  );
}