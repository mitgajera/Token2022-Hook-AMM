import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import ammIdl from '../idl/amm.json';
import hookIdl from '../idl/hook.json';

// New program IDs
const AMM_PROGRAM_ID_STR = process.env.NEXT_PUBLIC_AMM_PROGRAM_ID || '3KeeJh4v2qeSPMWekPwskMPkYVVBhqinixmEnWVdZ9mU';
const HOOK_PROGRAM_ID_STR = process.env.NEXT_PUBLIC_HOOK_PROGRAM_ID || '9JJWgpjTmmXYNhsUgqanojpfGdL5ovQTPaF53Gb8qX4J';

// Use actual program IDs from your deployment
export const AMM_PROGRAM_ID = new PublicKey(AMM_PROGRAM_ID_STR);
export const HOOK_PROGRAM_ID = new PublicKey(HOOK_PROGRAM_ID_STR);

// Program types - these should match your Rust program structure
export type AmmProgram = any;
export type HookProgram = any;

// Pool structure based on your Rust program
export interface PoolState {
  // Common fields for all pool types
  bump: number;
  fee: number;
  lpSupply: bigint;
  
  // For token-SOL pools
  tokenMint?: PublicKey;
  tokenVault?: PublicKey;
  solVault?: PublicKey;
  tokenAmount?: bigint;
  solAmount?: bigint;
  
  // For token-token pools
  tokenAMint?: PublicKey;
  tokenBMint?: PublicKey;
  tokenAVault?: PublicKey;
  tokenBVault?: PublicKey;
  tokenAAmount?: bigint;
  tokenBAmount?: bigint;
}

// Helper functions to get derived data
export function getTokenAmount(pool: PoolState): bigint {
  return pool.tokenAAmount || BigInt(0);
}

export function getSolAmount(pool: PoolState): bigint {
  return pool.tokenBAmount || BigInt(0);
}

// PDA derivation helpers
export function getPoolPda(
  tokenMintA: PublicKey, 
  tokenMintB?: PublicKey
): [PublicKey, number] {
  if (tokenMintB) {
    // For dual token pools (tokenA-tokenB pools)
    return PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenMintA.toBuffer(), tokenMintB.toBuffer()],
      AMM_PROGRAM_ID
    );
  } else {
    // For single token pools (token-SOL pools)
    return PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenMintA.toBuffer()],
      AMM_PROGRAM_ID
    );
  }
}

export function getVaultPda(pool: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), pool.toBuffer(), mint.toBuffer()],
    AMM_PROGRAM_ID
  );
}

export function getLpMintPda(pool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('lp_mint'), pool.toBuffer()],
    AMM_PROGRAM_ID
  );
}

export class AnchorWallet {
  constructor(private readonly walletContext: WalletContextState) {
    if (!walletContext.publicKey) {
      throw new Error('Wallet not connected');
    }
  }

  get publicKey(): PublicKey {
    return this.walletContext.publicKey!;
  }

  async signTransaction(transaction: any): Promise<any> {
    return this.walletContext.signTransaction!(transaction);
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    return this.walletContext.signAllTransactions!(transactions);
  }
}

export function getAnchorProvider(
  connection: Connection,
  wallet: WalletContextState
): AnchorProvider | null {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    return null;
  }

  const anchorWallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  } as any;

  return new AnchorProvider(connection, anchorWallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}

export async function getAmmProgram(
  provider: AnchorProvider
): Promise<Program<AmmProgram>> {
  return new (Program as any)(ammIdl, AMM_PROGRAM_ID, provider) as Program<AmmProgram>;
}

export async function getHookProgram(
  provider: AnchorProvider
): Promise<Program<HookProgram>> {
  return new (Program as any)(hookIdl, HOOK_PROGRAM_ID, provider) as Program<HookProgram>;
}

export class PoolStateClass implements PoolState {
  // Common fields for all pool types
  bump: number;
  fee: number;
  lpSupply: bigint;
  
  // For token-SOL pools
  tokenMint?: PublicKey;
  tokenVault?: PublicKey;
  solVault?: PublicKey;
  tokenAmount?: bigint;
  solAmount?: bigint;
  
  // For token-token pools
  tokenAMint?: PublicKey;
  tokenBMint?: PublicKey;
  tokenAVault?: PublicKey;
  tokenBVault?: PublicKey;
  tokenAAmount?: bigint;
  tokenBAmount?: bigint;
  
  constructor(data: PoolState) {
    this.bump = data.bump;
    this.fee = data.fee;
    this.lpSupply = data.lpSupply;
    this.tokenMint = data.tokenMint;
    this.tokenVault = data.tokenVault;
    this.solVault = data.solVault;
    this.tokenAmount = data.tokenAmount;
    this.solAmount = data.solAmount;
    this.tokenAMint = data.tokenAMint;
    this.tokenBMint = data.tokenBMint;
    this.tokenAVault = data.tokenAVault;
    this.tokenBVault = data.tokenBVault;
    this.tokenAAmount = data.tokenAAmount;
    this.tokenBAmount = data.tokenBAmount;
  }
}