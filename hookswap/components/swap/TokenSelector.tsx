'use client';

import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTokens } from '@/hooks/useTokens';
import { Token } from '@/types/token';
import Image from 'next/image';

interface TokenSelectorProps {
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
}

export function TokenSelector({ selectedToken, onTokenSelect }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { tokens } = useTokens();

  const filteredTokens = tokens.filter(token =>
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="glass-button h-12 px-3 min-w-[120px] justify-between"
        >
          {selectedToken ? (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {selectedToken.symbol.charAt(0)}
                </span>
              </div>
              <span className="font-medium">{selectedToken.symbol}</span>
            </div>
          ) : (
            <span className="text-gray-400">Select token</span>
          )}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="gradient-text">Select Token</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-glass pl-10"
            />
          </div>
          
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => handleTokenSelect(token)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-sm font-bold text-white">
                    {token.symbol.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-white">{token.symbol}</div>
                  <div className="text-sm text-gray-400">{token.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{token.balance}</div>
                  <div className="text-xs text-gray-400">${token.usdValue}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}