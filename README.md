# 🪝 HookSwap - Token-2022 AMM with Transfer Hooks

A revolutionary Automated Market Maker (AMM) that enables trading of Token-2022 tokens with active transfer hooks on Solana. This project solves the critical limitation where major AMMs don't support Token-2022 with transfer hooks, unlocking the full potential of programmable tokens for DeFi.

## 🌟 Features

### ✅ Token-2022 Integration
- **Transfer Hook Support**: Full integration with Token-2022 transfer hooks
- **KYC Validation**: Built-in KYC compliance through transfer hooks
- **Transfer Limits**: Configurable daily and per-transaction limits
- **Whitelisted Hooks**: Secure whitelist system for approved hook programs

### ✅ AMM Functionality
- **Pool Creation**: Create liquidity pools for any Token-2022 token
- **Swapping**: Token-to-SOL and SOL-to-token swaps with hook validation
- **Liquidity Management**: Add and remove liquidity with LP token rewards
- **Fee System**: 0.3% trading fee with proper distribution

### ✅ Security & Compliance
- **Hook Validation**: Every transfer is validated through the hook program
- **KYC Enforcement**: Users must have valid KYC status to transfer tokens
- **Transfer Limits**: Prevents abuse through configurable limits
- **Authority Management**: Secure program authority management

### ✅ User Experience
- **Modern UI**: Beautiful, responsive interface built with Next.js
- **Wallet Integration**: Support for Phantom, Solflare, and other Solana wallets
- **Real-time Updates**: Live pool data and transaction status
- **Error Handling**: Comprehensive error messages and validation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   AMM Program   │    │   Hook Program  │
│   (Next.js)     │◄──►│   (Anchor)      │◄──►│   (Anchor)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Wallet        │    │   Token-2022    │    │   KYC Data      │
│   Connection    │    │   Program       │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (latest)
- [Anchor CLI](https://book.anchor-lang.com/getting_started/installation.html) (latest)
- [Node.js](https://nodejs.org/) (v18 or later)
- [Yarn](https://yarnpkg.com/) or npm

### 1. Clone and Setup
```bash
git clone <repository-url>
cd token2022-hook-amm
```

### 2. Build Programs
```bash
# Build all programs
anchor build

# Or build individually
cd programs && anchor build
cd ../hook && anchor build
```

### 3. Deploy to Devnet
```bash
# Deploy AMM program
cd programs
anchor deploy --provider.cluster devnet

# Deploy Hook program
cd ../hook
anchor deploy --provider.cluster devnet
```

### 4. Update Program IDs
Update the program IDs in `Anchor.toml` and `hookswap/lib/anchor.ts` with the deployed addresses.

### 5. Initialize Hook Program
```bash
cd hook
anchor test --skip-local-validator
```

### 6. Start Frontend
```bash
cd hookswap
yarn install
yarn dev
```

Visit `http://localhost:3000` to access the application.

## 📖 Usage Guide

### Creating a Hooked Token

1. **Connect Wallet**: Connect your Solana wallet (Phantom, Solflare, etc.)
2. **Navigate to "Create Token"**: Click on the "Create Token" tab
3. **Fill Token Details**:
   - Token Name: e.g., "My Awesome Token"
   - Token Symbol: e.g., "MAT"
   - Decimals: Usually 9 for most tokens
   - Initial Supply: Total tokens to mint
4. **Create Token**: Click "Create Hooked Token"
5. **Verify**: The token will be created with transfer hooks enabled

### Creating a Liquidity Pool

1. **Navigate to "Create Pool"**: Click on the "Create Pool" tab
2. **Select Token**: Choose your hooked token from the dropdown
3. **Add Initial Liquidity**: Specify the amount of tokens and SOL to add
4. **Create Pool**: Click "Create Pool"
5. **Confirm**: The pool will be created and you'll receive LP tokens

### Swapping Tokens

1. **Navigate to "Swap"**: Click on the "Swap" tab
2. **Select Tokens**: Choose the token you want to swap and SOL
3. **Enter Amount**: Specify the amount to swap
4. **Review**: Check the exchange rate and fees
5. **Swap**: Click "Swap" to execute the transaction

### Managing Liquidity

1. **Navigate to "Pool"**: Click on the "Pool" tab
2. **Add Liquidity**:
   - Select your pool
   - Enter token and SOL amounts
   - Click "Add Liquidity"
3. **Remove Liquidity**:
   - Select your pool
   - Enter LP token amount
   - Click "Remove Liquidity"

## 🔧 Development

### Project Structure
```
token2022-hook-amm/
├── programs/                 # AMM Anchor workspace
│   ├── programs/amm/        # AMM program (Rust)
│   ├── tests/               # AMM tests (TypeScript)
│   └── migrations/          # Deployment scripts
├── hook/                    # Hook Anchor workspace
│   ├── programs/hook/       # Hook program (Rust)
│   ├── tests/               # Hook tests (TypeScript)
│   └── migrations/          # Deployment scripts
├── hookswap/                # Frontend application
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   └── types/               # TypeScript types
└── README.md               # This file
```

### Running Tests
```bash
# Test AMM program
cd programs
anchor test

# Test Hook program
cd ../hook
anchor test

# Test frontend (if applicable)
cd ../hookswap
yarn test
```

### Local Development
```bash
# Start local validator
solana-test-validator

# In another terminal, build and deploy
anchor build
anchor deploy

# Start frontend
cd hookswap
yarn dev
```

## 🔒 Security Features

### Transfer Hook Validation
- Every token transfer is validated through the hook program
- KYC status is checked before allowing transfers
- Transfer limits are enforced per user and per mint
- Failed validations prevent the transfer from completing

### Whitelisted Hook Programs
- Only approved hook programs can be used with the AMM
- Prevents malicious hook programs from being used
- Easy to add new approved programs to the whitelist

### Authority Management
- Secure program authority management
- Ability to update authorities when needed
- Timestamp tracking for all authority changes

## 🌐 Deployment

### Devnet Deployment
```bash
# Set cluster to devnet
solana config set --url devnet

# Deploy programs
anchor deploy --provider.cluster devnet

# Update program IDs in configuration files
```

### Mainnet Deployment
```bash
# Set cluster to mainnet
solana config set --url mainnet-beta

# Deploy programs (ensure proper testing first)
anchor deploy --provider.cluster mainnet-beta

# Update program IDs and frontend configuration
```

## 📊 Performance

- **Transaction Speed**: Optimized for fast execution
- **Gas Efficiency**: Minimal compute units for hook validation
- **Scalability**: Supports multiple tokens and pools
- **Reliability**: Robust error handling and recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Built with ❤️ for the Solana ecosystem**
