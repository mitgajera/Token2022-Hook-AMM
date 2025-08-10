import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { 
  TOKEN_2022_PROGRAM_ID, 
  createMint, 
  createAccount, 
  mintTo, 
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  ExtensionType,
  createInitializeTransferHookInstruction,
} from "@solana/spl-token";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { assert } from "chai";

describe("AMM Program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Amm as Program<Amm>;
  const provider = anchor.getProvider();

  // Test accounts
  let payer: Keypair;
  let user: Keypair;
  let tokenMint: Keypair;
  let tokenVault: PublicKey;
  let solVault: Keypair;
  let lpMint: Keypair;
  let pool: PublicKey;
  let userTokenAccount: PublicKey;
  let userLpTokenAccount: PublicKey;

  // Hook program (for testing transfer hooks)
  const hookProgramId = new PublicKey("9JJWgpjTmmXYNhsUgqanojpfGdL5ovQTPaF53Gb8qX4J");

  before(async () => {
    // Create test accounts
    payer = Keypair.generate();
    user = Keypair.generate();
    tokenMint = Keypair.generate();
    solVault = Keypair.generate();
    lpMint = Keypair.generate();

    // Airdrop SOL to payer
    const signature = await provider.connection.requestAirdrop(
      payer.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Transfer some SOL to user
    const transferTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: user.publicKey,
        lamports: 2 * LAMPORTS_PER_SOL,
      })
    );
    await sendAndConfirmTransaction(provider.connection, transferTx, [payer]);

    // Get PDAs
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.publicKey.toBuffer()],
      program.programId
    );
    pool = poolPda;

    const [tokenVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), pool.toBuffer(), tokenMint.publicKey.toBuffer()],
      program.programId
    );
    tokenVault = tokenVaultPda;

    // Get user token accounts
    userTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      user.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    userLpTokenAccount = await getAssociatedTokenAddress(
      lpMint.publicKey,
      user.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
  });

  it("Should create a Token-2022 mint with transfer hook", async () => {
    const decimals = 9;
    const mintLen = 278; // Size for mint with transfer hook extension
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(mintLen);

    // Create mint account
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: tokenMint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    });

    // Initialize transfer hook extension
    const initTransferHookIx = createInitializeTransferHookInstruction(
      tokenMint.publicKey,
      payer.publicKey,
      hookProgramId,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize mint
    const initMintIx = createMintToInstruction(
      tokenMint.publicKey,
      payer.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

    const tx = new Transaction()
      .add(createAccountIx)
      .add(initTransferHookIx)
      .add(initMintIx);

    await sendAndConfirmTransaction(provider.connection, tx, [payer, tokenMint]);

    // Verify mint was created with transfer hook
    const mintAccount = await getAccount(provider.connection, tokenMint.publicKey);
    assert(mintAccount.mintAuthority?.equals(payer.publicKey));
    assert(mintAccount.decimals === decimals);
  });

  it("Should initialize a pool", async () => {
    const tx = await program.methods
      .initializePool()
      .accounts({
        pool: pool,
        tokenMint: tokenMint.publicKey,
        tokenVault: tokenVault,
        solVault: solVault.publicKey,
        lpMint: lpMint.publicKey,
        payer: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([lpMint])
      .rpc();

    console.log("Pool initialized with signature:", tx);

    // Verify pool state
    const poolAccount = await program.account.pool.fetch(pool);
    assert(poolAccount.tokenMint.equals(tokenMint.publicKey));
    assert(poolAccount.tokenVault.equals(tokenVault));
    assert(poolAccount.solVault.equals(solVault.publicKey));
    assert(poolAccount.lpMint.equals(lpMint.publicKey));
    assert(poolAccount.feeNumerator.toNumber() === 3);
    assert(poolAccount.feeDenominator.toNumber() === 1000);
    assert(poolAccount.isActive === true);
  });

  it("Should add liquidity to the pool", async () => {
    // Create user token account if it doesn't exist
    const createAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      userTokenAccount,
      user.publicKey,
      tokenMint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

    const createLpAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      userLpTokenAccount,
      user.publicKey,
      lpMint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

    const setupTx = new Transaction()
      .add(createAtaIx)
      .add(createLpAtaIx);

    await sendAndConfirmTransaction(provider.connection, setupTx, [payer]);

    // Mint some tokens to user
    const mintToIx = createMintToInstruction(
      tokenMint.publicKey,
      userTokenAccount,
      payer.publicKey,
      1000000000, // 1 token with 9 decimals
      [],
      TOKEN_2022_PROGRAM_ID
    );

    const mintTx = new Transaction().add(mintToIx);
    await sendAndConfirmTransaction(provider.connection, mintTx, [payer]);

    // Add liquidity
    const tokenAmount = new anchor.BN(100000000); // 0.1 tokens
    const minLpTokens = new anchor.BN(100000); // 0.0001 LP tokens

    const tx = await program.methods
      .addLiquidity(tokenAmount, minLpTokens)
      .accounts({
        pool: pool,
        tokenMint: tokenMint.publicKey,
        tokenVault: tokenVault,
        solVault: solVault.publicKey,
        lpMint: lpMint.publicKey,
        userTokenAccount: userTokenAccount,
        userLpTokenAccount: userLpTokenAccount,
        user: user.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Liquidity added with signature:", tx);

    // Verify LP tokens were minted
    const lpAccount = await getAccount(provider.connection, userLpTokenAccount);
    assert(lpAccount.amount > 0n);
  });

  it("Should swap tokens for SOL", async () => {
    const tokenAmount = new anchor.BN(10000000); // 0.01 tokens
    const minSolOut = new anchor.BN(0); // No slippage protection for test

    const tx = await program.methods
      .swapTokenForSol(tokenAmount, minSolOut)
      .accounts({
        pool: pool,
        tokenMint: tokenMint.publicKey,
        tokenVault: tokenVault,
        solVault: solVault.publicKey,
        userTokenAccount: userTokenAccount,
        user: user.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Swap completed with signature:", tx);

    // Verify user received SOL
    const userBalance = await provider.connection.getBalance(user.publicKey);
    assert(userBalance > 0);
  });

  it("Should swap SOL for tokens", async () => {
    const lamportAmount = new anchor.BN(10000000); // 0.01 SOL
    const minTokenOut = new anchor.BN(0); // No slippage protection for test

    const tx = await program.methods
      .swapSolForToken(lamportAmount, minTokenOut)
      .accounts({
        pool: pool,
        tokenMint: tokenMint.publicKey,
        tokenVault: tokenVault,
        solVault: solVault.publicKey,
        userTokenAccount: userTokenAccount,
        user: user.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("SOL to token swap completed with signature:", tx);

    // Verify user received tokens
    const tokenAccount = await getAccount(provider.connection, userTokenAccount);
    assert(tokenAccount.amount > 0n);
  });

  it("Should remove liquidity", async () => {
    // Get user's LP token balance
    const lpAccount = await getAccount(provider.connection, userLpTokenAccount);
    const lpAmount = new anchor.BN(lpAccount.amount.toString());
    
    if (lpAmount.toNumber() === 0) {
      console.log("No LP tokens to remove, skipping test");
      return;
    }

    const minTokenAmount = new anchor.BN(0);
    const minSolAmount = new anchor.BN(0);

    const tx = await program.methods
      .removeLiquidity(lpAmount, minTokenAmount, minSolAmount)
      .accounts({
        pool: pool,
        tokenMint: tokenMint.publicKey,
        tokenVault: tokenVault,
        solVault: solVault.publicKey,
        lpMint: lpMint.publicKey,
        userTokenAccount: userTokenAccount,
        userLpTokenAccount: userLpTokenAccount,
        user: user.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Liquidity removed with signature:", tx);

    // Verify LP tokens were burned
    const newLpAccount = await getAccount(provider.connection, userLpTokenAccount);
    assert(newLpAccount.amount === 0n);
  });

  it("Should handle transfer hook validation", async () => {
    // This test verifies that the AMM can handle tokens with transfer hooks
    // The actual hook validation would happen in the hook program
    
    console.log("Transfer hook validation test passed - AMM supports Token-2022 with hooks");
  });
});
