# HookSwap - Solana AMM with Transfer Hooks

A modern, production-ready frontend for HookSwap, an Automated Market Maker (AMM) on Solana that supports Token-2022 with Transfer Hooks.

## Features

### 🔄 Swap Interface
- Token selection with real-time balance display
- Price impact and slippage calculations
- Real-time exchange rates from pool data
- Transaction fee estimation

### 💧 Liquidity Management
- Add liquidity to existing pools
- Remove liquidity with percentage-based slider
- Real-time pool statistics and reserves
- LP token balance tracking

### 🪙 Token Creation
- Create Token-2022 mints with transfer hooks
- Configurable decimals and initial supply
- Hook program integration for advanced features

### 🏊 Pool Creation
- Initialize new AMM pools
- Set custom fee structures
- Initial liquidity provision

### 🔗 Wallet Integration
- Support for Phantom, Solflare, and Backpack wallets
- Real-time balance fetching
- Transaction signing and confirmation

## Tech Stack

- **Frontend**: Next.js 13+ with TypeScript
- **Styling**: Tailwind CSS with glassmorphism design
- **Blockchain**: Solana Web3.js and Anchor framework
- **Wallet**: Solana Wallet Adapter
- **UI Components**: Radix UI with custom styling
- **Notifications**: React Hot Toast

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Program IDs

Update the program IDs in `lib/anchor.ts`:

```typescript
export const AMM_PROGRAM_ID = new PublicKey('YOUR_AMM_PROGRAM_ID_HERE');
export const HOOK_PROGRAM_ID = new PublicKey('YOUR_HOOK_PROGRAM_ID_HERE');
```

### 3. Add IDL Files

Place your generated IDL files in the project and import them in `lib/anchor.ts`:

```typescript
import ammIdl from './idl/amm.json';
import hookIdl from './idl/hook.json';
```

### 4. Update Program Methods

Ensure the program method calls match your Anchor program interface:

- `ammProgram.methods.swap()`
- `ammProgram.methods.addLiquidity()`
- `ammProgram.methods.removeLiquidity()`
- `ammProgram.methods.initializePool()`
- `hookProgram.methods.initializeHook()`

### 5. Configure Network

The app is configured for Solana Devnet by default. Update in `components/wallet/WalletProvider.tsx` for other networks.

### 6. Run Development Server

```bash
npm run dev
```

## Program Integration

### AMM Program Methods

The frontend expects these methods in your AMM program:

```rust
// Initialize a new pool
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    token_a_amount: u64,
    token_b_amount: u64,
    fee: u16,
) -> Result<()>

// Swap tokens
pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()>

// Add liquidity
pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    token_a_amount: u64,
    token_b_amount: u64,
    minimum_lp_tokens: u64,
) -> Result<()>

// Remove liquidity
pub fn remove_liquidity(
    ctx: Context<RemoveLiquidity>,
    lp_token_amount: u64,
    minimum_token_a_amount: u64,
    minimum_token_b_amount: u64,
) -> Result<()>
```

### Hook Program Methods

For Token-2022 with transfer hooks:

```rust
// Initialize hook for a mint
pub fn initialize_hook(
    ctx: Context<InitializeHook>,
    name: String,
    symbol: String,
    decimals: u8,
    initial_supply: u64,
) -> Result<()>
```

### Account Structure

Expected pool account structure:

```rust
#[account]
pub struct Pool {
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_vault: Pubkey,
    pub token_b_vault: Pubkey,
    pub lp_mint: Pubkey,
    pub token_a_amount: u64,
    pub token_b_amount: u64,
    pub lp_supply: u64,
    pub fee: u16, // in basis points
    pub bump: u8,
}
```

## Design Features

### Glassmorphism UI
- Backdrop blur effects with subtle transparency
- Purple/black gradient backgrounds
- Smooth hover animations and micro-interactions
- Modern card-based layout

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly interface elements

### Real-time Updates
- Live pool data fetching
- Account change subscriptions
- Dynamic balance updates

## Development Notes

### Mock Data Fallback
The app includes comprehensive mock data that allows full functionality testing without wallet connection or deployed programs.

### Error Handling
- Comprehensive try-catch blocks
- User-friendly error messages
- Transaction status notifications

### Performance
- Efficient re-rendering with React hooks
- Optimized Solana RPC calls
- Cached program instances

## Deployment

### Build for Production

```bash
npm run build
```

### Static Export

The app is configured for static export and can be deployed to any static hosting service:

```bash
npm run build
npm run export
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.