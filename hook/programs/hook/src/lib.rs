use anchor_lang::prelude::*;

declare_id!("Hook111111111111111111111111111111111111111");

#[program]
pub mod hook {
    use super::*;

    pub fn validate_transfer(ctx: Context<ValidateTransfer>) -> Result<()> {
        let kyc_account = &ctx.accounts.kyc;
        if kyc_account.data.borrow()[0] != 1 {
            return Err(error!(ErrorCode::KycFailed));
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateTransfer<'info> {
    /// CHECK: KYC account validation
    #[account(seeds = [b"kyc", owner.key().as_ref()], bump)]
    pub kyc: AccountInfo<'info>,

    pub owner: Signer<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("KYC validation failed!")]
    KycFailed,
}
