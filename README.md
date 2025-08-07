# Token 2022 Hook AMM

A monorepo containing an Automated Market Maker (AMM) and Token Hook implementation for SPL Token 2022.

## Structure

- `programs/amm/` - AMM program implementation
- `hook/` - Token hook program implementation
- `app/` - Frontend application

## Programs

### AMM Program
Located in [`programs/amm/programs/amm/src/lib.rs`](programs/amm/programs/amm/src/lib.rs)

Features:
- Pool initialization
- Add liquidity
- Token swapping

### Hook Program  
Located in [`hook/programs/hook/src/lib.rs`](programs/hook/programs/hook/src/lib.rs)

Features:
- Transfer validation
- KYC compliance

## Building

```bash
# Build all programs
cargo build-bpf

# Build specific program
cd programs/amm && anchor build
cd hook && anchor build
```

## Testing

```bash
# Test AMM
cd programs/amm && anchor test

# Test Hook
cd hook && anchor test
```