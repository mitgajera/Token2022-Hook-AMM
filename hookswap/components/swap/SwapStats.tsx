'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SwapStatsProps {
  stats: {
    exchangeRate: string;
    fee: string;
    priceImpact: string;
    minimumReceived: string;
  };
}

export function SwapStats({ stats }: SwapStatsProps) {
  return (
    <div className="text-sm space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center text-gray-400">
          <span>Rate</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="inline-block ml-1 w-3 h-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Exchange rate between tokens</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-gray-300">{stats.exchangeRate}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center text-gray-400">
          <span>Fee</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="inline-block ml-1 w-3 h-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Trading fee for this swap</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-gray-300">{stats.fee}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center text-gray-400">
          <span>Price Impact</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="inline-block ml-1 w-3 h-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Estimated change in price due to the size of your trade</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className={`
          ${parseFloat(stats.priceImpact) < 1 ? 'text-green-400' : ''}
          ${parseFloat(stats.priceImpact) >= 1 && parseFloat(stats.priceImpact) < 5 ? 'text-yellow-400' : ''}
          ${parseFloat(stats.priceImpact) >= 5 ? 'text-red-400' : ''}
        `}>{stats.priceImpact}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center text-gray-400">
          <span>Minimum Received</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="inline-block ml-1 w-3 h-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Minimum amount you&apos;ll receive after slippage</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-gray-300">{stats.minimumReceived}</span>
      </div>
    </div>
  );
}