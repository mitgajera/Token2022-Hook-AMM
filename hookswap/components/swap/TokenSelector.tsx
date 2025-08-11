'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Token } from '@/types/token';
import { useTokens } from '@/hooks/useTokens';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface TokenSelectorProps {
  selectedToken: Token | import('@/types/swap').Token | null;
  onTokenSelect: (token: Token | import('@/types/swap').Token) => void;
  side?: 'from' | 'to';
}

export function TokenSelector({ selectedToken, onTokenSelect, side }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { tokens, loading } = useTokens();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Load hooked tokens from local storage
  useEffect(() => {
    if (isOpen && !loading) {
      try {
        const hookedTokensStr = localStorage.getItem('hookedTokens');
        if (hookedTokensStr) {
          console.log('Found hooked tokens in localStorage:', hookedTokensStr);
        }
      } catch (e) {
        console.error('Error checking local storage for tokens:', e);
      }
    }
  }, [isOpen, loading]);

  // Filter tokens based on search term
  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        size="lg"
        className="token-selector-btn w-full justify-between bg-[#1a1b23] hover:bg-[#26262e] border-[#2d2d3d] text-white"
      >
        {selectedToken ? (
          <div className="flex items-center space-x-2">
            <TokenIcon token={selectedToken} />
            <span className="font-medium">{selectedToken.symbol}</span>
          </div>
        ) : (
          <span className="text-gray-400">Select Token</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      {isOpen && (
        <Card className="absolute z-50 mt-2 w-full min-w-[320px] max-w-[380px] right-0 overflow-hidden border border-[#2d2d3d] bg-[#1a1b23] shadow-2xl animate-in fade-in-0 zoom-in-95">
          <div className="p-3 border-b border-[#2d2d3d]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#26262e]/60 border-[#2d2d3d] text-white rounded-lg"
              />
            </div>
          </div>
          
          <ScrollArea className="max-h-[300px] overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-2">
                    <Skeleton className="h-8 w-8 rounded-full bg-[#26262e]" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20 bg-[#26262e]" />
                      <Skeleton className="h-3 w-12 bg-[#26262e]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No tokens found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTokens.map((token) => (
                  <button
                    key={'address' in token ? token.address : (token as any).mint || ''}
                    onClick={() => {
                      onTokenSelect(token);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-[#26262e] ${
                      (selectedToken && 'address' in selectedToken && 'address' in token && selectedToken.address === token.address) || 
                      (selectedToken && 'mint' in selectedToken && 'mint' in token && selectedToken.mint === token.mint) 
                        ? 'bg-[#26262e]' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <TokenIcon token={token} size={32} />
                      <div className="text-left">
                        <div className="font-medium text-white">{token.symbol}</div>
                        <div className="text-xs text-gray-400">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-300">
                      {token.balance}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

export function TokenIcon({ token, size = 24 }: { token: Token | import('@/types/swap').Token; size?: number }) {
  const [imageError, setImageError] = useState(false);
  const symbolLetter = token?.symbol?.charAt(0) || '?';
  
  // Use image if available and no error
  if (token?.logoURI && !imageError) {
    return (
      <div className="relative">
        <Image
          src={token.logoURI}
          alt={token.symbol}
          width={size}
          height={size}
          className="rounded-full object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  
  // Custom gradient avatar with first letter of token symbol
  return (
    <div 
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500"
      style={{ width: size, height: size }}
    >
      <span className="text-xs font-bold text-white">
        {symbolLetter}
      </span>
    </div>
  );
}