use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("EXfgq3u62BMSyPDT9hvyfYUCjEGuTcbq1ftkydqttAyA");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/// Early withdrawal penalty in basis points (1000 bps = 10%)
pub const PENALTY_BPS: u64 = 1000;

/// 1 year in seconds — used for beneficiary claim eligibility in production
pub const ONE_YEAR_SECS: i64 = 365 * 24 * 60 * 60;

/// 5 minutes grace period for testing (matching Flare)
pub const GRACE_PERIOD: i64 = 300; 

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PROGRAM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#[program]
pub mod savique_vault {
    use super::*;

    // ─────────────────────────────────────────────────────────────
    //  1.  Create a new Savings Vault
    // ─────────────────────────────────────────────────────────────
    pub fn create_vault(
        ctx: Context<CreateVault>,
        purpose: String,
        unlock_timestamp: i64,
        amount: u64,
        beneficiary: Option<Pubkey>,
    ) -> Result<()> {
        require!(purpose.len() <= 64, SaviqueError::PurposeTooLong);
        require!(amount > 0, SaviqueError::ZeroAmount);
        let clock = Clock::get()?;
        require!(unlock_timestamp > clock.unix_timestamp, SaviqueError::InvalidUnlockDate);

        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.mint = ctx.accounts.mint.key();
        vault.purpose = purpose;
        vault.unlock_timestamp = unlock_timestamp;
        vault.created_at = clock.unix_timestamp;
        vault.last_activity = clock.unix_timestamp;
        vault.penalty_bps = PENALTY_BPS;
        vault.is_active = true;
        vault.beneficiary = beneficiary;
        vault.total_deposited = amount;
        vault.bump = ctx.bumps.vault;

        let cpi_accounts = Transfer {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        msg!("Vault created for {}: {}", vault.owner, vault.purpose);
        Ok(())
    }

    // ─────────────────────────────────────────────────────────────
    //  2.  Deposit (Top-Up) into an existing vault
    // ─────────────────────────────────────────────────────────────
    pub fn deposit(ctx: Context<DepositVault>, amount: u64) -> Result<()> {
        require!(amount > 0, SaviqueError::ZeroAmount);
        let vault = &mut ctx.accounts.vault;
        require!(vault.is_active, SaviqueError::VaultInactive);

        vault.total_deposited = vault.total_deposited.checked_add(amount).ok_or(SaviqueError::Overflow)?;
        vault.last_activity = Clock::get()?.unix_timestamp;

        let cpi_accounts = Transfer {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        msg!("Deposited {} into vault {}", amount, vault.purpose);
        Ok(())
    }

    // ─────────────────────────────────────────────────────────────
    //  3.  Withdraw (after unlock time)
    // ─────────────────────────────────────────────────────────────
    pub fn withdraw(ctx: Context<WithdrawVault>) -> Result<()> {
        let clock = Clock::get()?;
        let vault = &mut ctx.accounts.vault;

        require!(vault.is_active, SaviqueError::VaultInactive);
        require!(clock.unix_timestamp >= vault.unlock_timestamp, SaviqueError::VaultStillLocked);
        require!(ctx.accounts.vault_token_account.amount > 0, SaviqueError::ZeroAmount);

        let amount = ctx.accounts.vault_token_account.amount;
        vault.is_active = false;
        vault.last_activity = clock.unix_timestamp;

        let owner_key = vault.owner;
        let bump = vault.bump;
        let purpose_bytes = vault.purpose.as_bytes();
        let seeds = &[
            b"vault",
            owner_key.as_ref(),
            purpose_bytes,
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer
        );
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    // ─────────────────────────────────────────────────────────────
    //  4.  Break Vault Early (with penalty)
    // ─────────────────────────────────────────────────────────────
    pub fn break_vault(ctx: Context<BreakVault>) -> Result<()> {
        let clock = Clock::get()?;
        let vault = &mut ctx.accounts.vault;

        require!(vault.is_active, SaviqueError::VaultInactive);
        require!(clock.unix_timestamp < vault.unlock_timestamp, SaviqueError::VaultAlreadyUnlocked);

        let balance = ctx.accounts.vault_token_account.amount;
        require!(balance > 0, SaviqueError::ZeroAmount);

        let penalty = balance
            .checked_mul(vault.penalty_bps)
            .ok_or(SaviqueError::Overflow)?
            .checked_div(10_000)
            .ok_or(SaviqueError::Overflow)?;
        let refund = balance.checked_sub(penalty).ok_or(SaviqueError::Overflow)?;

        vault.is_active = false;
        vault.last_activity = clock.unix_timestamp;

        let owner_key = vault.owner;
        let bump = vault.bump;
        let purpose_bytes = vault.purpose.as_bytes();
        let seeds = &[
            b"vault",
            owner_key.as_ref(),
            purpose_bytes,
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer
        );
        token::transfer(cpi_ctx, refund)?;

        if penalty > 0 {
            let cpi_accounts_penalty = Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: vault.to_account_info(),
            };
            let cpi_ctx_penalty = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts_penalty,
                signer
            );
            token::transfer(cpi_ctx_penalty, penalty)?;
        }

        Ok(())
    }

    // ─────────────────────────────────────────────────────────────
    //  5.  Claim by Beneficiary (after grace period)
    // ─────────────────────────────────────────────────────────────
    pub fn claim_by_beneficiary(ctx: Context<ClaimBeneficiary>) -> Result<()> {
        let clock = Clock::get()?;
        let vault = &mut ctx.accounts.vault;
        
        require!(vault.is_active, SaviqueError::VaultInactive);
        require!(vault.beneficiary.is_some(), SaviqueError::NoBeneficiarySet);
        
        let beneficiary_key = vault.beneficiary.unwrap();
        require!(ctx.accounts.beneficiary_token_account.owner == beneficiary_key, SaviqueError::InvalidBeneficiary);
        
        let grace_threshold = vault.unlock_timestamp.checked_add(GRACE_PERIOD).ok_or(SaviqueError::Overflow)?;
        require!(clock.unix_timestamp > grace_threshold, SaviqueError::GracePeriodNotOver);

        let amount = ctx.accounts.vault_token_account.amount;
        require!(amount > 0, SaviqueError::ZeroAmount);

        vault.is_active = false;
        vault.last_activity = clock.unix_timestamp;

        let owner_key = vault.owner;
        let bump = vault.bump;
        let purpose_bytes = vault.purpose.as_bytes();
        let seeds = &[
            b"vault",
            owner_key.as_ref(),
            purpose_bytes,
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.beneficiary_token_account.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer
        );
        token::transfer(cpi_ctx, amount)?;

        msg!("Beneficiary {} claimed {} from vault {}", beneficiary_key, amount, vault.purpose);
        Ok(())
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ACCOUNTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#[derive(Accounts)]
#[instruction(purpose: String)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = owner,
        space = VaultAccount::SIZE,
        seeds = [b"vault", owner.key().as_ref(), purpose.as_bytes()],
        bump,
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        init,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref(), vault.purpose.as_bytes()],
        bump = vault.bump,
        has_one = owner,
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref(), vault.purpose.as_bytes()],
        bump = vault.bump,
        has_one = owner,
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BreakVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref(), vault.purpose.as_bytes()],
        bump = vault.bump,
        has_one = owner,
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimBeneficiary<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref(), vault.purpose.as_bytes()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault.beneficiary.unwrap(),
    )]
    pub beneficiary_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct VaultAccount {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub purpose: String,
    pub unlock_timestamp: i64,
    pub created_at: i64,
    pub last_activity: i64,
    pub penalty_bps: u64,
    pub is_active: bool,
    pub total_deposited: u64,
    pub beneficiary: Option<Pubkey>,
    pub bump: u8,
}

impl VaultAccount {
    pub const SIZE: usize = 8 + 32 + 32 + (4 + 64) + 8 + 8 + 8 + 8 + 1 + 8 + (1 + 32) + 1;
}

#[error_code]
pub enum SaviqueError {
    #[msg("Vault is still locked. You cannot withdraw before the unlock date.")]
    VaultStillLocked,
    #[msg("Vault has already been unlocked. Use normal withdraw.")]
    VaultAlreadyUnlocked,
    #[msg("Vault is no longer active.")]
    VaultInactive,
    #[msg("Amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Purpose must be 64 characters or less.")]
    PurposeTooLong,
    #[msg("Unlock timestamp must be in the future.")]
    InvalidUnlockDate,
    #[msg("Arithmetic overflow.")]
    Overflow,
    #[msg("No beneficiary was set for this vault.")]
    NoBeneficiarySet,
    #[msg("The grace period after maturity has not yet expired.")]
    GracePeriodNotOver,
    #[msg("The provided token account does not belong to the authorized beneficiary.")]
    InvalidBeneficiary,
}
