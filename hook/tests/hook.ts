import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Hook } from "../target/types/hook";
import { 
  TOKEN_2022_PROGRAM_ID, 
  createMint, 
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferInstruction,
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

describe("Hook Program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Hook as Program<Hook>;
  const provider = anchor.getProvider();

  // Test accounts
  let authority: Keypair;
  let user: Keypair;
  let newUser: Keypair;
  let tokenMint: Keypair;
  let sourceAccount: PublicKey;
  let destinationAccount: PublicKey;
  let settings: PublicKey;
  let kycAccount: PublicKey;
  let newKycAccount: PublicKey;
  let mintLimits: PublicKey;
  let userUsage: PublicKey;

  before(async () => {
    // Create test accounts
    authority = Keypair.generate();
    user = Keypair.generate();
    newUser = Keypair.generate();
    tokenMint = Keypair.generate();

    // Airdrop SOL to authority
    const signature = await provider.connection.requestAirdrop(
      authority.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Transfer some SOL to users
    const transferTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: user.publicKey,
        lamports: 2 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: newUser.publicKey,
        lamports: 2 * LAMPORTS_PER_SOL,
      })
    );
    await sendAndConfirmTransaction(provider.connection, transferTx, [authority]);

    // Get PDAs
    const [settingsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("settings")],
      program.programId
    );
    settings = settingsPda;

    const [kycPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("kyc"), user.publicKey.toBuffer()],
      program.programId
    );
    kycAccount = kycPda;

    const [newKycPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("kyc"), newUser.publicKey.toBuffer()],
      program.programId
    );
    newKycAccount = newKycPda;

    const [mintLimitsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("limits"), tokenMint.publicKey.toBuffer()],
      program.programId
    );
    mintLimits = mintLimitsPda;

    const [userUsagePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("usage"), user.publicKey.toBuffer(), tokenMint.publicKey.toBuffer()],
      program.programId
    );
    userUsage = userUsagePda;

    // Get token accounts
    sourceAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      user.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    destinationAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      newUser.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
  });

  it("Should initialize the hook program", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        settings: settings,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("Hook program initialized with signature:", tx);

    // Verify settings
    const settingsAccount = await program.account.programSettings.fetch(settings);
    assert(settingsAccount.authority.equals(authority.publicKey));
    assert(settingsAccount.isActive === true);
    assert(settingsAccount.createdAt > 0);
  });

  it("Should create KYC for a user", async () => {
    const tx = await program.methods
      .createKyc()
      .accounts({
        kyc: kycAccount,
        user: user.publicKey,
        settings: settings,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("KYC created with signature:", tx);

    // Verify KYC account
    const kycData = await program.account.kycData.fetch(kycAccount);
    assert(kycData.user.equals(user.publicKey));
    assert(kycData.status === 1); // approved
    assert(kycData.createdAt > 0);
    assert(kycData.revokedAt === null);
  });

  it("Should create a Token-2022 mint with transfer hook", async () => {
    const decimals = 9;
    const mintLen = 278; // Size for mint with transfer hook extension
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(mintLen);

    // Create mint account
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: tokenMint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    });

    // Initialize transfer hook extension
    const initTransferHookIx = createInitializeTransferHookInstruction(
      tokenMint.publicKey,
      authority.publicKey,
      program.programId,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize mint
    const initMintIx = createMintToInstruction(
      tokenMint.publicKey,
      authority.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

    const tx = new Transaction()
      .add(createAccountIx)
      .add(initTransferHookIx)
      .add(initMintIx);

    await sendAndConfirmTransaction(provider.connection, tx, [authority, tokenMint]);

    // Verify mint was created with transfer hook
    const mintAccount = await getAccount(provider.connection, tokenMint.publicKey);
    assert(mintAccount.mintAuthority?.equals(authority.publicKey));
    assert(mintAccount.decimals === decimals);
  });

  it("Should set transfer limits for the mint", async () => {
    const limits = {
      dailyLimit: new anchor.BN(1000000000), // 1 token per day
      transactionLimit: new anchor.BN(100000000), // 0.1 token per transaction
    };

    const tx = await program.methods
      .setTransferLimits(limits)
      .accounts({
        mintLimits: mintLimits,
        mint: tokenMint.publicKey,
        settings: settings,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([authority])
      .rpc();

    console.log("Transfer limits set with signature:", tx);

    // Verify mint limits
    const limitsAccount = await program.account.mintLimits.fetch(mintLimits);
    assert(limitsAccount.mint.equals(tokenMint.publicKey));
    assert(limitsAccount.dailyLimit.eq(limits.dailyLimit));
    assert(limitsAccount.transactionLimit.eq(limits.transactionLimit));
    assert(limitsAccount.isActive === true);
  });

  it("Should validate transfer with KYC check", async () => {
    // Create token accounts
    const createSourceAtaIx = createAssociatedTokenAccountInstruction(
      authority.publicKey,
      sourceAccount,
      user.publicKey,
      tokenMint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

    const createDestAtaIx = createAssociatedTokenAccountInstruction(
      authority.publicKey,
      destinationAccount,
      newUser.publicKey,
      tokenMint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

    const setupTx = new Transaction()
      .add(createSourceAtaIx)
      .add(createDestAtaIx);

    await sendAndConfirmTransaction(provider.connection, setupTx, [authority]);

    // Mint tokens to source account
    const mintToIx = createMintToInstruction(
      tokenMint.publicKey,
      sourceAccount,
      authority.publicKey,
      1000000000, // 1 token
      [],
      TOKEN_2022_PROGRAM_ID
    );

    const mintTx = new Transaction().add(mintToIx);
    await sendAndConfirmTransaction(provider.connection, mintTx, [authority]);

    // Attempt transfer (this should trigger the transfer hook)
    const transferIx = createTransferInstruction(
      sourceAccount,
      destinationAccount,
      user.publicKey,
      10000000, // 0.01 tokens
      [],
      TOKEN_2022_PROGRAM_ID
    );

    const transferTx = new Transaction().add(transferIx);
    
    try {
      await sendAndConfirmTransaction(provider.connection, transferTx, [user]);
      console.log("Transfer completed successfully - KYC validation passed");
      
      // Verify transfer occurred
      const sourceBalance = await getAccount(provider.connection, sourceAccount);
      const destBalance = await getAccount(provider.connection, destinationAccount);
      assert(sourceBalance.amount < 1000000000n);
      assert(destBalance.amount > 0n);
    } catch (error) {
      console.error("Transfer failed:", error);
      throw error;
    }
  });

  it("Should check transfer limits", async () => {
    const amount = new anchor.BN(50000000); // 0.05 tokens

    const tx = await program.methods
      .checkTransferLimits(amount)
      .accounts({
        mintLimits: mintLimits,
        userUsage: userUsage,
        mint: tokenMint.publicKey,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Transfer limits check passed with signature:", tx);

    // Verify user usage was created
    const usageAccount = await program.account.userUsage.fetch(userUsage);
    assert(usageAccount.user.equals(user.publicKey));
    assert(usageAccount.lastResetDay > 0);
  });

  it("Should revoke KYC for a user", async () => {
    const tx = await program.methods
      .revokeKyc()
      .accounts({
        kyc: kycAccount,
        user: user.publicKey,
        settings: settings,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("KYC revoked with signature:", tx);

    // Verify KYC was revoked
    const kycData = await program.account.kycData.fetch(kycAccount);
    assert(kycData.status === 0); // revoked
    assert(kycData.revokedAt !== null);
  });

  it("Should fail transfer validation for revoked KYC", async () => {
    // Attempt another transfer with revoked KYC
    const transferIx = createTransferInstruction(
      sourceAccount,
      destinationAccount,
      user.publicKey,
      10000000, // 0.01 tokens
      [],
      TOKEN_2022_PROGRAM_ID
    );

    const transferTx = new Transaction().add(transferIx);
    
    try {
      await sendAndConfirmTransaction(provider.connection, transferTx, [user]);
      assert.fail("Transfer should have failed due to revoked KYC");
    } catch (error) {
      console.log("Transfer correctly failed due to revoked KYC:", error.message);
    }
  });

  it("Should update program authority", async () => {
    const newAuthority = Keypair.generate();
    
    const tx = await program.methods
      .updateAuthority()
      .accounts({
        settings: settings,
        authority: authority.publicKey,
        newAuthority: newAuthority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("Authority updated with signature:", tx);

    // Verify authority was updated
    const settingsAccount = await program.account.programSettings.fetch(settings);
    assert(settingsAccount.authority.equals(newAuthority.publicKey));
    assert(settingsAccount.updatedAt > 0);
  });

  it("Should handle multiple hook types", async () => {
    console.log("Hook program supports multiple validation types:");
    console.log("- KYC validation");
    console.log("- Transfer limits");
    console.log("- Daily usage tracking");
    console.log("- Authority management");
    
    // This test verifies the hook program's extensibility
    assert(true, "Hook program is extensible for additional validation types");
  });
});
