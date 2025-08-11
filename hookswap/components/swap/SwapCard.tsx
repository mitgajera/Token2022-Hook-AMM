'use client';

import { useState } from 'react';
import { ArrowDownUp, Settings, Zap, Shield, Info as InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { TokenSelector, TokenIcon } from './TokenSelector';
import { SwapInput } from './SwapInput';
import { SwapStats } from './SwapStats';
import { useSwap } from '@/hooks/useSwap';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Token } from '@/types/token';

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
    poolLoading,
    tokensLoading,
    poolExists   
  } = useSwap();

  // State for settings
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.5');

  // Function to handle swapping the tokens position
  const handleSwapDirection = () => {
    // Don't swap if either token is null
    if (!tokenA || !tokenB) return;
    
    const tempToken = tokenA;
    const tempAmount = amountA;
    
    setTokenA(tokenB);
    setTokenB(tempToken);
    setAmountA(amountB);
    setAmountB(tempAmount);
  };

  // Function to execute the swap
  const handleSwap = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenA || !tokenB) {
      toast.error('Please select tokens');
      return;
    }

    if (!amountA || parseFloat(amountA) <= 0) {
      toast.error('Please enter an amount');
      return;
    }

    try {
      await swapTokens();
    } catch (error) {
      console.error('Swap error:', error);
    }
  };

  // Add these adapter functions after your useState declarations
  const handleTokenASelect = (token: Token | import('@/types/swap').Token) => {
    // If we're getting a Token from types/token.ts (with address), convert it to types/swap.ts Token (with mint)
    if ('address' in token) {
      const convertedToken = {
        mint: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        balance: token.balance
      };
      setTokenA(convertedToken);
    } else {
      // It's already the right type
      setTokenA(token);
    }
  };

  const handleTokenBSelect = (token: Token | import('@/types/swap').Token) => {
    if ('address' in token) {
      const convertedToken = {
        mint: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        balance: token.balance
      };
      setTokenB(convertedToken);
    } else {
      setTokenB(token);
    }
  };

  return (
    <Card className="glass-card border-[#2d2d3d] bg-[#16171d]/60 p-5 w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Zap className="w-5 h-5 text-purple-400 mr-2" />
          Swap
        </h2>
      </div>

      {/* From Token */}
      <div className="space-y-2 mb-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm text-gray-400">From</span>
          <span className="text-sm text-gray-400">
            Balance: {tokenA?.balance || '0.00'}
          </span>
        </div>
        
        <div className="bg-[#1a1b23]/80 rounded-xl border border-[#2d2d3d] p-4">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <SwapInput
                value={amountA}
                onChange={setAmountA}
                placeholder="0.00"
                className="text-2xl font-medium bg-transparent text-white border-none focus:ring-0 p-0 h-auto"
              />
              {tokenA && (
                <div className="mt-1 text-xs text-gray-400">
                  ≈ $0.00
                </div>
              )}
            </div>
            <TokenSelector
              selectedToken={tokenA}
              onTokenSelect={handleTokenASelect}
              side="from"
            />
          </div>
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center -my-1 z-10 relative">
        <Button
          variant="outline"
          size="icon"
          onClick={handleSwapDirection}
          className="rounded-full bg-[#26262e] border-[#2d2d3d] hover:bg-[#36363e] hover:text-white shadow-lg h-10 w-10"
        >
          <ArrowDownUp className="h-4 w-4" />
        </Button>
      </div>

      {/* To Token */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm text-gray-400">To</span>
          <span className="text-sm text-gray-400">
            Balance: {tokenB?.balance || '0.00'}
          </span>
        </div>
        
        <div className="bg-[#1a1b23]/80 rounded-xl border border-[#2d2d3d] p-4">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <SwapInput
                value={amountB}
                onChange={setAmountB}
                placeholder="0.00"
                readOnly
                className="text-2xl font-medium bg-transparent text-white border-none focus:ring-0 p-0 h-auto"
              />
              {tokenB && (
                <div className="mt-1 text-xs text-gray-400">
                  ≈ $0.00
                </div>
              )}
            </div>
            <TokenSelector
              selectedToken={tokenB}
              onTokenSelect={handleTokenBSelect}
              side="to"
            />
          </div>
        </div>
      </div>

      {/* Swap Stats */}
      {tokenA && tokenB && amountA && amountB && !isLoading && (
        <div className="bg-[#1a1b23]/60 rounded-xl border border-[#2d2d3d] p-3 mb-4">
          <SwapStats stats={swapStats} />
        </div>
      )}

      {/* Swap Button or Connect Wallet */}
      {!connected ? (
        <WalletMultiButton className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center" />
      ) : (
        <Button
          onClick={handleSwap}
          disabled={!tokenA || !tokenB || !amountA || isLoading || poolLoading || !poolExists}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold py-6 rounded-xl h-auto"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Swapping...</span>
            </div>
          ) : !tokenA || !tokenB ? (
            'Select Tokens'
          ) : !amountA ? (
            'Enter Amount'
          ) : !poolExists ? (
            'No Liquidity Pool Available'
          ) : (
            'Swap'
          )}
        </Button>
      )}

      {/* Protected by transfer hooks badge */}
      <div className="flex items-center justify-center text-xs text-gray-400 mt-4">
        <Shield className="w-3 h-3 mr-1.5" />
        Protected by transfer hooks
      </div>
    </Card>
  );
}