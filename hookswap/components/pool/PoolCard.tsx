'use client';

import { useState } from 'react';
import { Plus, Minus, TrendingUp, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AddLiquidityForm } from './AddLiquidityForm';
import { RemoveLiquidityForm } from './RemoveLiquidityForm';
import { PoolStats } from './PoolStats';
import { usePool } from '@/hooks/usePool';
import { useWallet } from '@solana/wallet-adapter-react';

export function PoolCard() {
  const { connected } = useWallet();
  const { poolStats, addLiquidity, removeLiquidity, isLoading } = usePool();

  return (
    <Card className="glass-card p-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Droplets className="w-5 h-5 text-purple-400" />
          <span>Liquidity</span>
        </h2>
      </div>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2 glass-card p-1">
          <TabsTrigger value="add" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-500">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </TabsTrigger>
          <TabsTrigger value="remove" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-500">
            <Minus className="w-4 h-4 mr-2" />
            Remove
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          {/* Pool Stats */}
          <PoolStats stats={poolStats} />

          <TabsContent value="add" className="mt-0">
            <AddLiquidityForm
              onAddLiquidity={addLiquidity}
              isLoading={isLoading}
              connected={connected}
            />
          </TabsContent>

          <TabsContent value="remove" className="mt-0">
            <RemoveLiquidityForm
              onRemoveLiquidity={removeLiquidity}
              isLoading={isLoading}
              connected={connected}
              lpBalance={poolStats.userLPBalance}
            />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}