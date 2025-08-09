use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token_interface::{
    Mint, TokenAccount, TokenInterface,
    transfer_checked, TransferChecked, MintTo, mint_to, burn, Burn,
};
use std::cmp;

declare_id!("7448D3Cy2jdvFPJrUNhVY4uaAvf83EffSNa6Jbu4BqHG");

// Fee settings
const FEE_NUMERATOR: u64 = 3;
const FEE_DENOMINATOR: u64 = 1000; // 0.3% fee

#[program]
pub mod amm {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.token_vault = ctx.accounts.token_vault.key();
        pool.sol_vault = ctx.accounts.sol_vault.key();
        pool.lp_mint = ctx.accounts.lp_mint.key();
        // Anchor v0.29+: ctx.bumps is a struct with fields
        pool.bump = ctx.bumps.pool;
        pool.fee_numerator = FEE_NUMERATOR;
        pool.fee_denominator = FEE_DENOMINATOR;

        msg!("Pool initialized for token {}", pool.token_mint);
        Ok(())
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        token_amount: u64,
        min_lp_tokens: u64,
    ) -> Result<()> {
        // Transfer tokens from user -> token_vault
        let token_transfer_ctx = TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_transfer_ctx,
        );

        transfer_checked(
            cpi_ctx,
            token_amount,
            ctx.accounts.token_mint.decimals,
        )?;

        // Calculate SOL amount and LP tokens to mint
        let sol_amount: u64;
        let lp_tokens_to_mint: u64;

        if ctx.accounts.token_vault.amount == 0 {
            // first deposit — in production require explicit SOL input
            sol_amount = ctx.accounts.user.lamports();
            lp_tokens_to_mint = (token_amount as u128)
                .checked_mul(1_000_000)
                .unwrap_or(0) as u64;
        } else {
            let token_reserve = ctx.accounts.token_vault.amount.saturating_sub(token_amount);
            let sol_reserve = ctx.accounts.sol_vault.lamports();

            require!(token_reserve > 0 && sol_reserve > 0, ErrorCode::InsufficientLiquidity);

            sol_amount = (token_amount as u128)
                .checked_mul(sol_reserve as u128)
                .unwrap_or(0)
                .checked_div(token_reserve as u128)
                .unwrap_or(0) as u64;

            let total_supply = ctx.accounts.lp_mint.supply;
            lp_tokens_to_mint = if total_supply > 0 {
                let token_ratio = (token_amount as u128)
                    .checked_mul(total_supply as u128)
                    .unwrap_or(0)
                    .checked_div(token_reserve as u128)
                    .unwrap_or(0) as u64;

                let sol_ratio = (sol_amount as u128)
                    .checked_mul(total_supply as u128)
                    .unwrap_or(0)
                    .checked_div(sol_reserve as u128)
                    .unwrap_or(0) as u64;

                cmp::min(token_ratio, sol_ratio)
            } else {
                (token_amount as u128)
                    .checked_mul(1_000_000)
                    .unwrap_or(0) as u64
            };
        }

        require!(
            lp_tokens_to_mint >= min_lp_tokens,
            ErrorCode::SlippageExceeded
        );

        // Transfer SOL from user -> sol_vault (user signed)
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.sol_vault.key(),
            sol_amount,
        );

        // user signed, no program signer needed
        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        // Mint LP tokens to user via pool PDA authority
        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[
            b"pool".as_ref(),
            token_mint_key.as_ref(),
            &[ctx.accounts.pool.bump],
        ];
        let signer = &[&seeds[..]];

        let mint_cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.user_lp_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        );

        mint_to(mint_cpi_ctx, lp_tokens_to_mint)?;

        msg!(
            "Added liquidity: {} tokens, {} SOL, {} LP tokens minted",
            token_amount,
            sol_amount,
            lp_tokens_to_mint
        );

        Ok(())
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_amount: u64,
        min_token_amount: u64,
        min_sol_amount: u64,
    ) -> Result<()> {
        let pool_token_amount = ctx.accounts.token_vault.amount;
        let pool_sol_amount = ctx.accounts.sol_vault.lamports();
        let lp_supply = ctx.accounts.lp_mint.supply;

        require!(lp_supply > 0, ErrorCode::InsufficientLiquidity);

        let token_amount = (pool_token_amount as u128)
            .checked_mul(lp_amount as u128)
            .unwrap_or(0)
            .checked_div(lp_supply as u128)
            .unwrap_or(0) as u64;

        let sol_amount = (pool_sol_amount as u128)
            .checked_mul(lp_amount as u128)
            .unwrap_or(0)
            .checked_div(lp_supply as u128)
            .unwrap_or(0) as u64;

        require!(token_amount >= min_token_amount, ErrorCode::SlippageExceeded);
        require!(sol_amount >= min_sol_amount, ErrorCode::SlippageExceeded);

        // Burn user's LP tokens (user sign)
        let burn_cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.lp_mint.to_account_info(),
                from: ctx.accounts.user_lp_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );

        burn(burn_cpi_ctx, lp_amount)?;

        // Transfer tokens from pool -> user (signed by pool PDA)
        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[
            b"pool".as_ref(),
            token_mint_key.as_ref(),
            &[ctx.accounts.pool.bump],
        ];
        let signer = &[&seeds[..]];

        let token_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.token_vault.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        );

        transfer_checked(
            token_transfer_ctx,
            token_amount,
            ctx.accounts.token_mint.decimals,
        )?;

        // Transfer SOL from pool -> user (signed by pool PDA)
        let sol_ix = system_instruction::transfer(
            &ctx.accounts.sol_vault.key(),
            &ctx.accounts.user.key(),
            sol_amount,
        );

        invoke_signed(
            &sol_ix,
            &[
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer,
        )?;

        msg!(
            "Removed liquidity: {} LP tokens burned, {} tokens and {} SOL returned",
            lp_amount,
            token_amount,
            sol_amount
        );

        Ok(())
    }

    pub fn swap_token_for_sol(
        ctx: Context<SwapToken>,
        token_amount: u64,
        min_sol_out: u64,
    ) -> Result<()> {
        // Transfer tokens from user -> token_vault
        let token_transfer_ctx = TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_transfer_ctx,
        );

        transfer_checked(
            cpi_ctx,
            token_amount,
            ctx.accounts.token_mint.decimals,
        )?;

        // Compute output SOL amount (constant product approximation)
        let token_reserve = ctx.accounts.token_vault.amount.saturating_sub(token_amount);
        let sol_reserve = ctx.accounts.sol_vault.lamports();

        require!(token_reserve > 0 && sol_reserve > 0, ErrorCode::InsufficientLiquidity);

        let sol_out = (sol_reserve as u128)
            .checked_mul(token_amount as u128)
            .unwrap_or(0)
            .checked_div(token_reserve as u128)
            .unwrap_or(0) as u64;

        let fee = (sol_out as u128)
            .checked_mul(FEE_NUMERATOR as u128)
            .unwrap_or(0)
            .checked_div(FEE_DENOMINATOR as u128)
            .unwrap_or(0) as u64;

        let sol_out_after_fee = sol_out.saturating_sub(fee);

        require!(sol_out_after_fee >= min_sol_out, ErrorCode::SlippageExceeded);

        // Transfer SOL to user signed by pool PDA
        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[
            b"pool".as_ref(),
            token_mint_key.as_ref(),
            &[ctx.accounts.pool.bump],
        ];
        let signer = &[&seeds[..]];

        let sol_ix = system_instruction::transfer(
            &ctx.accounts.sol_vault.key(),
            &ctx.accounts.user.key(),
            sol_out_after_fee,
        );

        invoke_signed(
            &sol_ix,
            &[
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer,
        )?;

        msg!("Swapped {} tokens for {} SOL", token_amount, sol_out_after_fee);

        Ok(())
    }

    pub fn swap_sol_for_token(
        ctx: Context<SwapSol>,
        lamport_amount: u64,
        min_token_out: u64,
    ) -> Result<()> {
        // Transfer SOL from user -> sol_vault (user signed)
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.sol_vault.key(),
            lamport_amount,
        );

        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        // Calculate token out
        let sol_reserve = ctx.accounts.sol_vault.lamports().saturating_sub(lamport_amount);
        let token_reserve = ctx.accounts.token_vault.amount;

        require!(sol_reserve > 0 && token_reserve > 0, ErrorCode::InsufficientLiquidity);

        let token_out = (token_reserve as u128)
            .checked_mul(lamport_amount as u128)
            .unwrap_or(0)
            .checked_div(sol_reserve as u128)
            .unwrap_or(0) as u64;

        let fee = (token_out as u128)
            .checked_mul(FEE_NUMERATOR as u128)
            .unwrap_or(0)
            .checked_div(FEE_DENOMINATOR as u128)
            .unwrap_or(0) as u64;

        let token_out_after_fee = token_out.saturating_sub(fee);

        require!(token_out_after_fee >= min_token_out, ErrorCode::SlippageExceeded);

        // Transfer tokens to user (signed by pool PDA)
        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[
            b"pool".as_ref(),
            token_mint_key.as_ref(),
            &[ctx.accounts.pool.bump],
        ];
        let signer = &[&seeds[..]];

        let token_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.token_vault.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        );

        transfer_checked(
            token_transfer_ctx,
            token_out_after_fee,
            ctx.accounts.token_mint.decimals,
        )?;

        msg!("Swapped {} SOL for {} tokens", lamport_amount, token_out_after_fee);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 32 + 32 + 32 + 1 + 8 + 8, // Add space for lp_mint and fee settings
        seeds = [b"pool", token_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = payer,
        seeds = [b"vault", pool.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = pool
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: This is a native SOL account
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 9,
        mint::authority = pool
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    // token_program is a Program/Interface, not an account
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"pool", token_mint.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = token_vault.key() == pool.token_vault @ ErrorCode::InvalidVault
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: This is a native SOL account
    #[account(
        mut,
        constraint = sol_vault.key() == pool.sol_vault @ ErrorCode::InvalidVault
    )]
    pub sol_vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = lp_mint.key() == pool.lp_mint @ ErrorCode::InvalidMint
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = user_token_account.mint == token_mint.key() @ ErrorCode::InvalidMint,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_lp_token_account.mint == lp_mint.key() @ ErrorCode::InvalidMint,
        constraint = user_lp_token_account.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_lp_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"pool", token_mint.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = token_vault.key() == pool.token_vault @ ErrorCode::InvalidVault
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: This is a native SOL account
    #[account(
        mut,
        constraint = sol_vault.key() == pool.sol_vault @ ErrorCode::InvalidVault
    )]
    pub sol_vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = lp_mint.key() == pool.lp_mint @ ErrorCode::InvalidMint
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = user_token_account.mint == token_mint.key() @ ErrorCode::InvalidMint,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_lp_token_account.mint == lp_mint.key() @ ErrorCode::InvalidMint,
        constraint = user_lp_token_account.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_lp_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapToken<'info> {
    #[account(
        seeds = [b"pool", token_mint.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = token_vault.key() == pool.token_vault @ ErrorCode::InvalidVault
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: This is a native SOL account
    #[account(
        mut,
        constraint = sol_vault.key() == pool.sol_vault @ ErrorCode::InvalidVault
    )]
    pub sol_vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = user_token_account.mint == token_mint.key() @ ErrorCode::InvalidMint,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapSol<'info> {
    #[account(
        seeds = [b"pool", token_mint.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = token_vault.key() == pool.token_vault @ ErrorCode::InvalidVault
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: This is a native SOL account
    #[account(
        mut,
        constraint = sol_vault.key() == pool.sol_vault @ ErrorCode::InvalidVault
    )]
    pub sol_vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = user_token_account.mint == token_mint.key() @ ErrorCode::InvalidMint,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Pool {
    pub token_mint: Pubkey,
    pub token_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub lp_mint: Pubkey,
    pub bump: u8,
    pub fee_numerator: u64,
    pub fee_denominator: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Invalid vault account")]
    InvalidVault,

    #[msg("Invalid mint account")]
    InvalidMint,

    #[msg("Invalid owner")]
    InvalidOwner,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
}
