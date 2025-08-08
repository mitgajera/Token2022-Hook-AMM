use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked};

declare_id!("5oMNX1WenL9DKfb5Yyf28c7Tbns2nqmMnv1FoTMJwuju");

#[program]
pub mod amm {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.token_vault = ctx.accounts.token_vault.key();
        pool.sol_vault = ctx.accounts.sol_vault.key();
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, token_amount: u64, lamports: u64) -> Result<()> {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
            },
        );
        transfer_checked(cpi_ctx, token_amount, ctx.accounts.token_mint.decimals)?;

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.sol_vault.key(),
            lamports,
        );
        invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }

    pub fn swap_token_for_sol(ctx: Context<SwapToken>, token_amount: u64) -> Result<()> {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
            },
        );
        transfer_checked(cpi_ctx, token_amount, ctx.accounts.token_mint.decimals)?;

        let lamports = token_amount;
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= lamports;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += lamports;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init, 
        seeds = [b"pool", token_mint.key().as_ref()], 
        bump, 
        payer = payer, 
        space = 8 + 32 + 32 + 32 + 1
    )]
    pub pool: Account<'info, Pool>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: This is the SOL vault account
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: This is the SOL vault account
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>, 
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub pool: Account<'info, Pool>,
}

#[derive(Accounts)]
pub struct SwapToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: This is the SOL vault account
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub pool: Account<'info, Pool>,
}

#[account]
pub struct Pool {
    pub token_mint: Pubkey,
    pub token_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub bump: u8,
}