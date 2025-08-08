import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Program IDs - Replace with your actual program IDs
export const AMM_PROGRAM_ID = new PublicKey('5oMNX1WenL9DKfb5Yyf28c7Tbns2nqmMnv1FoTMJwuju');
export const HOOK_PROGRAM_ID = new PublicKey('FYUyJbrXRQJpGnjfZTFCdEUvFnknkTGbrdHhRUQkezib');

// IDL types - You'll need to generate these from your programs
export interface AmmProgram {
  methods: {
    initializePool: (params: any) => any;
    swap: (params: any) => any;
    addLiquidity: (params: any) => any;
    removeLiquidity: (params: any) => any;
  };
  account: {
    pool: {
      fetch: (address: PublicKey) => Promise<any>;
    };
  };
}

export interface HookProgram {
  methods: {
    initializeHook: (params: any) => any;
    createHookedToken: (params: any) => any;
  };
}

export function getAnchorProvider(
  connection: Connection,
  wallet: WalletContextState
): AnchorProvider | null {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    return null;
  }

  const anchorWallet: Wallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  };

  return new AnchorProvider(connection, anchorWallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}

export async function getAmmProgram(
  provider: AnchorProvider
): Promise<Program<AmmProgram>> {
  // Load your AMM IDL here
  // const idl = await Program.fetchIdl(AMM_PROGRAM_ID, provider);
  // For now, you'll need to import your generated IDL
  const idl = {} as any; // Replace with actual IDL import
  
  return new Program(idl, AMM_PROGRAM_ID, provider) as Program<AmmProgram>;
}

export async function getHookProgram(
  provider: AnchorProvider
): Promise<Program<HookProgram>> {
  // Load your Hook IDL here
  const idl = {} as any; // Replace with actual IDL import
  
  return new Program(idl, HOOK_PROGRAM_ID, provider) as Program<HookProgram>;
}

// Pool state interface - adjust based on your program's pool account structure
export interface PoolState {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  lpMint: PublicKey;
  tokenAAmount: bigint;
  tokenBAmount: bigint;
  lpSupply: bigint;
  fee: number;
  bump: number;
}

// Utility functions for PDA derivation
export function getPoolPda(tokenAMint: PublicKey, tokenBMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('pool'),
      tokenAMint.toBuffer(),
      tokenBMint.toBuffer(),
    ],
    AMM_PROGRAM_ID
  );
}

export function getVaultPda(poolPda: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      poolPda.toBuffer(),
      mint.toBuffer(),
    ],
    AMM_PROGRAM_ID
  );
}

export function getLpMintPda(poolPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('lp_mint'),
      poolPda.toBuffer(),
    ],
    AMM_PROGRAM_ID
  );
}