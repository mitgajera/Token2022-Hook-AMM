use anchor_lang::prelude::*;

declare_id!("DTmjxgRSQNJLwBa4wxkwffXqW4TKPfzq9r9MMToXx9bX");

#[program]
pub mod hook {
    use super::*;

    /// Transfer hook validation function called during token transfers
    pub fn validate_transfer(ctx: Context<ValidateTransfer>) -> Result<()> {
        let kyc_account = &ctx.accounts.kyc;
        if kyc_account.status != 1 {
            return Err(error!(ErrorCode::KycFailed));
        }
        Ok(())
    }

    /// Create a new KYC status record for a user
    pub fn create_kyc(ctx: Context<CreateKyc>) -> Result<()> {
        let kyc_account = &mut ctx.accounts.kyc;
        kyc_account.status = 1; // approved
        msg!("KYC approved for {}", ctx.accounts.user.key());
        Ok(())
    }

    /// Revoke KYC status for a user
    pub fn revoke_kyc(ctx: Context<RevokeKyc>) -> Result<()> {
        let kyc_account = &mut ctx.accounts.kyc;
        kyc_account.status = 0; // revoked
        msg!("KYC revoked for {}", ctx.accounts.user.key());
        Ok(())
    }

    /// Update program authority
    pub fn update_authority(ctx: Context<UpdateAuthority>) -> Result<()> {
        let settings = &mut ctx.accounts.settings;
        settings.authority = ctx.accounts.new_authority.key();
        msg!("Authority updated to {}", settings.authority);
        Ok(())
    }

    /// Initialize settings (create settings PDA)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let settings = &mut ctx.accounts.settings;
        settings.authority = ctx.accounts.authority.key();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateTransfer<'info> {
    /// KYC account that stores approval status
    #[account(seeds = [b"kyc", owner.key().as_ref()], bump)]
    pub kyc: Account<'info, KycData>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateKyc<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 1, // 1 byte for KYC status
        seeds = [b"kyc", user.key().as_ref()],
        bump
    )]
    pub kyc: Account<'info, KycData>,

    /// User who will be KYC approved
    /// CHECK: Can be any account
    pub user: AccountInfo<'info>,

    #[account(
        mut,
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
        bump
    )]
    pub kyc: Account<'info, KycData>,

    /// User whose KYC will be revoked
    /// CHECK: Can be any account
    pub user: AccountInfo<'info>,

    #[account(
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
        bump
    )]
    pub settings: Account<'info, ProgramSettings>,

    #[account(
        constraint = settings.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// CHECK: New authority can be any account
    pub new_authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32, // 32 bytes for pubkey
        seeds = [b"settings"],
        bump
    )]
    pub settings: Account<'info, ProgramSettings>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct KycData {
    pub status: u8,
}

#[account]
pub struct ProgramSettings {
    pub authority: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("KYC validation failed!")]
    KycFailed,
    #[msg("Unauthorized operation")]
    Unauthorized,
}
