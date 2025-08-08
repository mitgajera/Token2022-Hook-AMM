'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, Droplets } from 'lucide-react';

interface NavigationProps {
  activeTab: 'swap' | 'pool';
  onTabChange: (tab: 'swap' | 'pool') => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="flex justify-center mb-8">
      <div className="glass-card p-1 rounded-xl">
        <div className="flex space-x-1">
          <button
            onClick={() => onTabChange('swap')}
            className={cn(
              'flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300',
              activeTab === 'swap'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Swap</span>
          </button>
          <button
            onClick={() => onTabChange('pool')}
            className={cn(
              'flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300',
              activeTab === 'pool'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Droplets className="w-4 h-4" />
            <span>Pool</span>
          </button>
        </div>
      </div>
    </div>
  );
}