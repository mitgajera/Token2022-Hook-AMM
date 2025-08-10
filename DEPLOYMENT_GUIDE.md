# 🚀 HookSwap Deployment Guide

## Overview

This guide will walk you through deploying HookSwap to Solana devnet and mainnet. The deployment process includes:

1. Building the programs
2. Deploying to devnet for testing
3. Deploying to mainnet for production
4. Updating the frontend configuration

## Prerequisites

### Required Tools
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (latest)
- [Anchor CLI](https://book.anchor-lang.com/getting_started/installation.html) (latest)
- [Node.js](https://nodejs.org/) (v18 or later)
- [Yarn](https://yarnpkg.com/) or npm

### Solana Configuration
```bash
# Check current configuration
solana config get

# Set to devnet for testing
solana config set --url devnet

# Set to mainnet for production
solana config set --url mainnet-beta
```

### Wallet Setup
```bash
# Create a new keypair for deployment
solana-keygen new --outfile deploy-keypair.json

# Set as default wallet
solana config set --keypair deploy-keypair.json

# Check balance
solana balance
```

## Step 1: Build Programs

### Build AMM Program
```bash
cd programs
anchor build
cd ..
```

### Build Hook Program
```bash
cd hook
anchor build
cd ..
```

### Verify Build Output
```bash
# Check AMM program
ls -la programs/target/deploy/
# Should see: amm.so

# Check Hook program
ls -la hook/target/deploy/
# Should see: hook.so
```

## Step 2: Deploy to Devnet

### Get Devnet SOL
```bash
# Request airdrop (2 SOL)
solana airdrop 2

# Verify balance
solana balance
```

### Deploy AMM Program
```bash
cd programs

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Note the program ID from output
# Example: Program Id: 3KeeJh4v2qeSPMWekPwskMPkYVVBhqinixmEnWVdZ9mU

cd ..
```

### Deploy Hook Program
```bash
cd hook

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Note the program ID from output
# Example: Program Id: 9JJWgpjTmmXYNhsUgqanojpfGdL5ovQTPaF53Gb8qX4J

cd ..
```

### Update Program IDs
```bash
# Update Anchor.toml
sed -i 's/3KeeJh4v2qeSPMWekPwskMPkYVVBhqinixmEnWVdZ9mU/YOUR_AMM_PROGRAM_ID/g' Anchor.toml
sed -i 's/9JJWgpjTmmXYNhsUgqanojpfGdL5ovQTPaF53Gb8qX4J/YOUR_HOOK_PROGRAM_ID/g' Anchor.toml

# Update frontend configuration
sed -i 's/3KeeJh4v2qeSPMWekPwskMPkYVVBhqinixmEnWVdZ9mU/YOUR_AMM_PROGRAM_ID/g' hookswap/lib/anchor.ts
sed -i 's/9JJWgpjTmmXYNhsUgqanojpfGdL5ovQTPaF53Gb8qX4J/YOUR_HOOK_PROGRAM_ID/g' hookswap/lib/anchor.ts
```

## Step 3: Initialize Programs

### Initialize Hook Program
```bash
cd hook

# Run tests to initialize
anchor test --skip-local-validator --provider.cluster devnet

cd ..
```

### Verify Deployment
```bash
# Check program accounts
solana program show YOUR_AMM_PROGRAM_ID
solana program show YOUR_HOOK_PROGRAM_ID

# Check program data
solana account YOUR_AMM_PROGRAM_ID
solana account YOUR_HOOK_PROGRAM_ID
```

## Step 4: Deploy Frontend

### Build Frontend
```bash
cd hookswap

# Install dependencies
yarn install

# Build for production
yarn build

cd ..
```

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd hookswap
vercel --prod

# Follow prompts to configure deployment
cd ..
```

### Alternative: Deploy to Netlify
```bash
# Build and deploy
cd hookswap
yarn build
# Upload dist/ folder to Netlify
cd ..
```

## Step 5: Test on Devnet

### Test Token Creation
1. Open the deployed frontend
2. Connect wallet (Phantom, Solflare, etc.)
3. Navigate to "Create Token"
4. Create a test token with transfer hooks
5. Verify token appears in wallet

### Test Pool Creation
1. Navigate to "Create Pool"
2. Select your test token
3. Add initial liquidity
4. Verify pool is created

### Test Trading
1. Navigate to "Swap"
2. Perform a test swap
3. Verify transfer hooks are enforced
4. Check transaction history

## Step 6: Deploy to Mainnet

### Prerequisites
- [ ] All devnet tests pass
- [ ] Security audit completed
- [ ] Sufficient SOL balance for deployment
- [ ] Emergency procedures documented

### Mainnet Deployment
```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Verify wallet has sufficient SOL
solana balance

# Deploy programs (same commands as devnet)
cd programs
anchor deploy --provider.cluster mainnet-beta
cd ..

cd hook
anchor deploy --provider.cluster mainnet-beta
cd ..

# Update program IDs in mainnet configuration
# Update frontend configuration
# Deploy frontend to production
```

## Step 7: Post-Deployment

### Monitor Programs
```bash
# Check program status
solana program show YOUR_AMM_PROGRAM_ID
solana program show YOUR_HOOK_PROGRAM_ID

# Monitor logs
solana logs YOUR_AMM_PROGRAM_ID
solana logs YOUR_HOOK_PROGRAM_ID
```

### Update Documentation
- [ ] Update README.md with mainnet program IDs
- [ ] Update deployment scripts
- [ ] Document any configuration changes
- [ ] Update frontend environment variables

## Configuration Files

### Environment Variables
Create `.env.local` in the frontend directory:
```bash
NEXT_PUBLIC_AMM_PROGRAM_ID=YOUR_AMM_PROGRAM_ID
NEXT_PUBLIC_HOOK_PROGRAM_ID=YOUR_HOOK_PROGRAM_ID
NEXT_PUBLIC_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

### Anchor.toml
```toml
[programs.devnet]
amm = "YOUR_AMM_PROGRAM_ID"
hook = "YOUR_HOOK_PROGRAM_ID"

[programs.mainnet-beta]
amm = "YOUR_MAINNET_AMM_PROGRAM_ID"
hook = "YOUR_MAINNET_HOOK_PROGRAM_ID"
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clean and rebuild
anchor clean
anchor build

# Check Rust version
rustc --version
```

#### Deployment Failures
```bash
# Check wallet balance
solana balance

# Check network status
solana cluster-version

# Verify program size
ls -la target/deploy/*.so
```

#### Frontend Issues
```bash
# Clear cache
rm -rf .next
yarn dev

# Check console for errors
# Verify program IDs are correct
```

### Support
- Check [Solana Status](https://status.solana.com/)
- Review [Anchor Documentation](https://book.anchor-lang.com/)
- Check [Solana Discord](https://discord.gg/solana)

## Security Considerations

### Program Upgrades
- Programs are immutable once deployed
- Plan upgrades carefully
- Test thoroughly on devnet first

### Key Management
- Secure deployment keypairs
- Use hardware wallets for production
- Implement multi-signature for critical operations

### Monitoring
- Set up alerts for program errors
- Monitor transaction volume
- Track gas usage and costs

## Performance Optimization

### RPC Endpoints
- Use dedicated RPC providers for production
- Implement fallback endpoints
- Monitor response times

### Caching
- Implement frontend caching
- Use CDN for static assets
- Optimize API calls

## Conclusion

Following this guide will ensure a successful deployment of HookSwap to both devnet and mainnet. Remember to:

1. Test thoroughly on devnet
2. Secure your deployment keys
3. Monitor programs after deployment
4. Keep documentation updated
5. Plan for future upgrades

For additional support, refer to the project documentation or open an issue on GitHub.
