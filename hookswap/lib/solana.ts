'use client';

import { useMemo } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import ammIdl from '../idl/amm.json';
import hookIdl from '../idl/hook.json';

// Constants for program IDs
const CLUSTER = process.env.NEXT_PUBLIC_CLUSTER || 'https://api.devnet.solana.com';
const AMM_PROGRAM_ID_STR = process.env.NEXT_PUBLIC_AMM_PROGRAM_ID || "5oMNX1WenL9DKfb5Yyf28c7Tbns2nqmMnv1FoTMJwuju";
const HOOK_PROGRAM_ID_STR = process.env.NEXT_PUBLIC_HOOK_PROGRAM_ID || "FYUyJbrXRQJpGnjfZTFCdEUvFnknkTGbrdHhRUQkezib";

export const AMM_PROGRAM_ID = new PublicKey(AMM_PROGRAM_ID_STR);
export const HOOK_PROGRAM_ID = new PublicKey(HOOK_PROGRAM_ID_STR);

export function usePrograms() {
  const wallet = useAnchorWallet();
  const connection = useMemo(() => new Connection(CLUSTER, 'confirmed'), []);
  
  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  }, [wallet, connection]);

  const ammProgram = useMemo(() => {
    if (!provider || !ammIdl) return null;
    try {
      return new Program(ammIdl as Idl, AMM_PROGRAM_ID, provider);
    } catch (error) {
      console.error('Failed to initialize AMM program:', error);
      return null;
    }
  }, [provider]);

  const hookProgram = useMemo(() => {
    if (!provider || !hookIdl) return null;
    try {
      return new Program(hookIdl as Idl, HOOK_PROGRAM_ID, provider);
    } catch (error) {
      console.error('Failed to initialize Hook program:', error);
      return null;
    }
  }, [provider]);

  return { connection, wallet, provider, ammProgram, hookProgram };
}
