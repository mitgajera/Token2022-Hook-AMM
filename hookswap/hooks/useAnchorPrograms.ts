'use client';

import { useState, useEffect, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program } from '@coral-xyz/anchor';
import { 
  getAnchorProvider, 
  getAmmProgram, 
  getHookProgram, 
  AmmProgram, 
  HookProgram 
} from '@/lib/anchor';

export function useAnchorPrograms() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [ammProgram, setAmmProgram] = useState<Program<AmmProgram> | null>(null);
  const [hookProgram, setHookProgram] = useState<Program<HookProgram> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(() => {
    if (!wallet.connected) return null;
    return getAnchorProvider(connection, wallet);
  }, [connection, wallet.connected, wallet.publicKey]);

  useEffect(() => {
    async function initializePrograms() {
      if (!provider) {
        setAmmProgram(null);
        setHookProgram(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [ammProg, hookProg] = await Promise.all([
          getAmmProgram(provider),
          getHookProgram(provider),
        ]);

        setAmmProgram(ammProg);
        setHookProgram(hookProg);
      } catch (err) {
        console.error('Failed to initialize programs:', err);
        setError('Failed to initialize programs');
      } finally {
        setLoading(false);
      }
    }

    initializePrograms();
  }, [provider]);

  return {
    ammProgram,
    hookProgram,
    provider,
    loading,
    error,
    connected: wallet.connected,
  };
}