import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import ammIdl from '../idl/amm.json';
import hookIdl from '../idl/hook.json';

// Use actual program IDs from your deployment
export const AMM_PROGRAM_ID = new PublicKey('5oMNX1WenL9DKfb5Yyf28c7Tbns2nqmMnv1FoTMJwuju');
export const HOOK_PROGRAM_ID = new PublicKey('FYUyJbrXRQJpGnjfZTFCdEUvFnknkTGbrdHhRUQkezib');

// Program types - these should match your Rust program structure
export type AmmProgram = any;
export type HookProgram = any;

// Pool structure based on your Rust program
export interface PoolState {
  tokenMint: PublicKey;
  tokenVault: PublicKey;
  solVault: PublicKey;
  bump: number;
  fee: number;
  tokenAAmount: bigint;
  tokenBAmount: bigint;
  lpSupply: bigint;
}

// Helper functions to get derived data
export function getTokenAmount(pool: PoolState): bigint {
  return pool.tokenAAmount || 0n;
}

export function getSolAmount(pool: PoolState): bigint {
  return pool.tokenBAmount || 0n;
}

// PDA derivation helpers
export function getPoolPda(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), tokenMint.toBuffer()],
    AMM_PROGRAM_ID
  );
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

export class AnchorWallet implements Wallet {
  constructor(readonly payer: WalletContextState) {}

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

  async signTransaction(transaction: any): Promise<any> {
    return this.payer.signTransaction(transaction);
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    return this.payer.signAllTransactions(transactions);
  }
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
  return new Program(ammIdl, AMM_PROGRAM_ID, provider) as Program<AmmProgram>;
}

export async function getHookProgram(
  provider: AnchorProvider
): Promise<Program<HookProgram>> {
  return new Program(hookIdl, HOOK_PROGRAM_ID, provider) as Program<HookProgram>;
}

export class PoolStateClass implements PoolState {
  tokenMint: PublicKey;
  tokenVault: PublicKey;
  solVault: PublicKey;
  bump: number;
  fee: number;
  tokenAAmount: bigint;
  tokenBAmount: bigint;
  lpSupply: bigint;
  
  constructor(data: PoolState) {
    this.tokenMint = data.tokenMint;
    this.tokenVault = data.tokenVault;
    this.solVault = data.solVault;
    this.bump = data.bump;
    this.fee = data.fee;
    this.tokenAAmount = data.tokenAAmount;
    this.tokenBAmount = data.tokenBAmount;
    this.lpSupply = data.lpSupply;
  }
}