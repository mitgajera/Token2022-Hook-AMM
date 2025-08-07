# Token2022 Hook AMM Monorepo

This repository contains an Automated Market Maker (AMM) and a Token Hook program for SPL Token 2022, built with [Anchor](https://book.anchor-lang.com/) for Solana. It also includes a frontend application.

---

## Repository Structure

```
.
├── app/                # Frontend application (placeholder)
├── hook/               # Token hook Anchor workspace
│   ├── programs/hook/  # Rust hook program
│   ├── tests/          # JS/TS tests for hook
│   └── migrations/     # Anchor deploy scripts
├── programs/           # AMM Anchor workspace
│   ├── programs/amm/   # Rust AMM program
│   ├── tests/          # JS/TS tests for AMM
│   └── migrations/     # Anchor deploy scripts
├── target/             # Build output (ignored)
├── Anchor.toml         # Anchor workspace config
├── Cargo.toml          # Rust workspace config
└── README.md           # This file
```

---

## Programs

### AMM Program

- Location: [`programs/programs/amm/`](programs/programs/amm/)
- Features:
  - Pool initialization
  - Add liquidity
  - Token-for-SOL swaps

### Hook Program

- Location: [`hook/programs/hook/`](hook/programs/hook/)
- Features:
  - Transfer validation hooks
  - KYC compliance logic

---

## Building

Build all programs:
```sh
anchor build
```

Or build individually:
```sh
cd programs && anchor build
cd ../hook && anchor build
```

---

## Testing

Run Anchor tests for each program:

**AMM:**
```sh
cd programs && anchor test
```
Test file: [`programs/tests/amm.ts`](programs/tests/amm.ts)

**Hook:**
```sh
cd hook && anchor test
```
Test file: [`hook/tests/hook.ts`](hook/tests/hook.ts)

---

## Deploy Scripts

- AMM deploy: [`programs/migrations/deploy.ts`](programs/migrations/deploy.ts)
- Hook deploy: [`hook/migrations/deploy.ts`](hook/migrations/deploy.ts)

---

## Requirements

- [Rust](https://www.rust-lang.org/tools/install)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor CLI](https://book.anchor-lang.com/getting_started/installation.html)
- Node.js (for tests and frontend)

---

## Notes

- The `target/` directory is auto-generated and can be cleaned with `anchor clean`.
- The frontend in `app/` is a placeholder and not yet implemented.