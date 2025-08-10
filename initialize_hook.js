const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const fs = require('fs');

// Configuration
const HOOK_PROGRAM_ID = new PublicKey('9JJWgpjTmmXYNhsUgqanojpfGdL5ovQTPaF53Gb8qX4J');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load wallet
const walletKeypair = JSON.parse(fs.readFileSync('C:/Users/gajer/.config/solana/id.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(walletKeypair));

const provider = new AnchorProvider(connection, { publicKey: wallet.publicKey, signTransaction: (tx) => Promise.resolve(tx), signAllTransactions: (txs) => Promise.resolve(txs) }, { commitment: 'confirmed' });

async function initializeHook() {
    try {
        console.log('🚀 Initializing Hook Program...');
        console.log('Program ID:', HOOK_PROGRAM_ID.toString());
        console.log('Wallet:', wallet.publicKey.toString());

        // Get the settings PDA
        const [settingsPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('settings')],
            HOOK_PROGRAM_ID
        );

        console.log('Settings PDA:', settingsPda.toString());

        // Create initialization instruction
        const instruction = {
            programId: HOOK_PROGRAM_ID,
            keys: [
                { pubkey: settingsPda, isSigner: false, isWritable: true },
                { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: Buffer.from([0]) // Initialize instruction
        };

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // Sign and send transaction
        transaction.sign(wallet);
        const signature = await connection.sendRawTransaction(transaction.serialize());
        
        console.log('✅ Hook program initialized successfully!');
        console.log('Transaction signature:', signature);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature);
        console.log('✅ Transaction confirmed!');

    } catch (error) {
        console.error('❌ Error initializing hook program:', error);
    }
}

initializeHook();
