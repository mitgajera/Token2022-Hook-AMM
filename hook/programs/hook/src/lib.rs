use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenInterface, Mint, TokenAccount};

declare_id!("9JJWgpjTmmXYNhsUgqanojpfGdL5ovQTPaF53Gb8qX4J");

#[program]
pub mod hook {
    use super::*;

    pub fn validate_transfer(ctx: Context<ValidateTransfer>) -> Result<()> {
        let kyc_account = &ctx.accounts.kyc;
        if kyc_account.status != 1 {
            return Err(error!(ErrorCode::KycFailed));
        }
        msg!("Transfer validated successfully for user: {}", ctx.accounts.owner.key());
        Ok(())
    }

    pub fn create_kyc(ctx: Context<CreateKyc>) -> Result<()> {
        let kyc = &mut ctx.accounts.kyc;
        kyc.user = ctx.accounts.user.key();
        kyc.status = 1; // Approved
        kyc.created_at = Clock::get()?.unix_timestamp;
        kyc.revoked_at = None;
        msg!("KYC created for user: {}", kyc.user);
        Ok(())
    }

    pub fn revoke_kyc(ctx: Context<RevokeKyc>) -> Result<()> {
        let kyc = &mut ctx.accounts.kyc;
        kyc.status = 0; // Revoked
        kyc.revoked_at = Some(Clock::get()?.unix_timestamp);
        msg!("KYC revoked for user: {}", kyc.user);
        Ok(())
    }

    pub fn update_authority(ctx: Context<UpdateAuthority>) -> Result<()> {
        let settings = &mut ctx.accounts.settings;
        settings.authority = ctx.accounts.new_authority.key();
        settings.updated_at = Clock::get()?.unix_timestamp;
        msg!("Authority updated to: {}", settings.authority);
        Ok(())
    }

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let settings = &mut ctx.accounts.settings;
        settings.authority = ctx.accounts.authority.key();
        settings.created_at = Clock::get()?.unix_timestamp;
        settings.is_active = true;
        settings.updated_at = Clock::get()?.unix_timestamp;
        msg!("Hook program initialized with authority: {}", settings.authority);
        Ok(())
    }

    pub fn set_transfer_limits(ctx: Context<SetTransferLimits>, limits: TransferLimits) -> Result<()> {
        let mint_limits = &mut ctx.accounts.mint_limits;
        mint_limits.mint = ctx.accounts.mint.key();
        mint_limits.daily_limit = limits.daily_limit;
        mint_limits.transaction_limit = limits.transaction_limit;
        mint_limits.is_active = true;
        mint_limits.updated_at = Clock::get()?.unix_timestamp;
        msg!("Transfer limits set for mint: {}", mint_limits.mint);
        Ok(())
    }

    pub fn check_transfer_limits(ctx: Context<CheckTransferLimits>, amount: u64) -> Result<()> {
        let mint_limits = &ctx.accounts.mint_limits;
        let user_usage = &mut ctx.accounts.user_usage;
        
        // Check transaction limit
        require!(amount <= mint_limits.transaction_limit, ErrorCode::TransferLimitExceeded);
        
        // Check daily limit
        let current_day = Clock::get()?.unix_timestamp / 86400; // Days since epoch
        
        if user_usage.last_reset_day != current_day {
            user_usage.daily_used = 0;
            user_usage.last_reset_day = current_day;
        }
        
        require!(
            user_usage.daily_used + amount <= mint_limits.daily_limit,
            ErrorCode::DailyLimitExceeded
        );
        
        user_usage.daily_used += amount;
        user_usage.last_transaction = Clock::get()?.unix_timestamp;
        user_usage.user = ctx.accounts.user.key();
        
        msg!("Transfer limits checked successfully for amount: {}", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateTransfer<'info> {
    /// KYC account that stores approval status
    #[account(
        seeds = [b"kyc", owner.key().as_ref()], 
        bump,
        constraint = kyc.user == owner.key() @ ErrorCode::InvalidKycAccount
    )]
    pub kyc: Account<'info, KycData>,

    /// The owner of the tokens being transferred
    pub owner: Signer<'info>,

    /// The mint being transferred
    pub mint: InterfaceAccount<'info, Mint>,

    /// Source token account
    pub source: InterfaceAccount<'info, TokenAccount>,

    /// Destination token account
    pub destination: InterfaceAccount<'info, TokenAccount>,

    /// Token program
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CreateKyc<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 8 + 8, // user + status + created_at + revoked_at
        seeds = [b"kyc", user.key().as_ref()],
        bump
    )]
    pub kyc: Account<'info, KycData>,

    /// User who will be KYC approved
    /// CHECK: Can be any account
    pub user: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"settings"],
        bump,
        constraint = settings.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub settings: Account<'info, ProgramSettings>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeKyc<'info> {
    #[account(
        mut,
        seeds = [b"kyc", user.key().as_ref()],
        bump,
        constraint = kyc.user == user.key() @ ErrorCode::InvalidKycAccount
    )]
    pub kyc: Account<'info, KycData>,

    /// User whose KYC will be revoked
    /// CHECK: Can be any account
    pub user: AccountInfo<'info>,

    #[account(
        seeds = [b"settings"],
        bump,
        constraint = settings.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub settings: Account<'info, ProgramSettings>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAuthority<'info> {
    #[account(
        mut,
        seeds = [b"settings"],
        bump,
        constraint = settings.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub settings: Account<'info, ProgramSettings>,

    pub authority: Signer<'info>,

    /// CHECK: New authority can be any account
    pub new_authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 1 + 8, // authority + created_at + is_active + updated_at
        seeds = [b"settings"],
        bump
    )]
    pub settings: Account<'info, ProgramSettings>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetTransferLimits<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 1 + 8, // mint + daily_limit + transaction_limit + is_active + updated_at
        seeds = [b"limits", mint.key().as_ref()],
        bump
    )]
    pub mint_limits: Account<'info, MintLimits>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [b"settings"],
        bump,
        constraint = settings.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub settings: Account<'info, ProgramSettings>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CheckTransferLimits<'info> {
    #[account(
        seeds = [b"limits", mint.key().as_ref()],
        bump,
        constraint = mint_limits.mint == mint.key() @ ErrorCode::InvalidMintLimits
    )]
    pub mint_limits: Account<'info, MintLimits>,

    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8, // user + daily_used + last_reset_day + last_transaction
        seeds = [b"usage", user.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub user_usage: Account<'info, UserUsage>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct KycData {
    pub user: Pubkey,
    pub status: u8, // 0 = revoked, 1 = approved
    pub created_at: i64,
    pub revoked_at: Option<i64>,
}

#[account]
pub struct ProgramSettings {
    pub authority: Pubkey,
    pub created_at: i64,
    pub is_active: bool,
    pub updated_at: i64,
}

#[account]
pub struct MintLimits {
    pub mint: Pubkey,
    pub daily_limit: u64,
    pub transaction_limit: u64,
    pub is_active: bool,
    pub updated_at: i64,
}

#[account]
pub struct UserUsage {
    pub user: Pubkey,
    pub daily_used: u64,
    pub last_reset_day: i64,
    pub last_transaction: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TransferLimits {
    pub daily_limit: u64,
    pub transaction_limit: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("KYC validation failed!")]
    KycFailed,
    #[msg("Unauthorized operation")]
    Unauthorized,
    #[msg("Invalid KYC account")]
    InvalidKycAccount,
    #[msg("Transfer limit exceeded")]
    TransferLimitExceeded,
    #[msg("Daily limit exceeded")]
    DailyLimitExceeded,
    #[msg("Invalid mint limits")]
    InvalidMintLimits,
}
