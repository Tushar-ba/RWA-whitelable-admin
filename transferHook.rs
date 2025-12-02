use anchor_lang::{
    prelude::*,
    system_program::{create_account, CreateAccount},
};
use anchor_spl::token_interface::{Mint, TokenAccount};
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};

declare_id!("HPpSduHvXR6U26ZWPy9DRuASMzGnqis8EPKNxiHHbWJY");

#[program]
pub mod transfer_hook_gatekeeper {
    use super::*;

    /// Initialize the extra account meta list for the transfer hook
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        let account_metas = vec![
            // index 5: source blacklist PDA
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal { bytes: "blacklist".as_bytes().to_vec() },
                    Seed::AccountKey { index: 1 }, // The mint account
                    Seed::AccountKey { index: 3 }, // source token account owner
                ],
                false, // is_signer
                false, // is_writable
            )?,
            // index 6: destination blacklist PDA
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal { bytes: "blacklist".as_bytes().to_vec() },
                    Seed::AccountKey { index: 1 }, // The mint account
                    Seed::AccountKey { index: 2 }, // destination token account owner
                ],
                false, // is_signer
                false, // is_writable
            )?,
        ];

        let account_size = ExtraAccountMetaList::size_of(account_metas.len())? as u64;
        let lamports = Rent::get()?.minimum_balance(account_size as usize);

        let mint = ctx.accounts.mint.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"extra-account-metas",
            &mint.as_ref(),
            &[ctx.bumps.extra_account_meta_list],
        ]];

        create_account(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.extra_account_meta_list.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            lamports,
            account_size,
            ctx.program_id,
        )?;

        ExtraAccountMetaList::init::<ExecuteInstruction>(
            &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
            &account_metas,
        )?;

        Ok(())
    }

    /// Initialize the gatekeeper configuration
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.config.admin = ctx.accounts.admin.key();
        Ok(())
    }
    


    pub fn set_admin(ctx: Context<SetAdmin>, admin: Pubkey) -> Result<()> {
        ctx.accounts.config.admin = admin;
        Ok(())
    }
    
    /// Add an address to the blacklist
    pub fn add_to_blacklist(ctx: Context<AddToBlacklist>) -> Result<()> {
        // Check if user has AssetProtector role
        let signer_key = ctx.accounts.authority.key();
        let is_main_admin = signer_key == ctx.accounts.config.admin;
        let has_enum_role = ctx.accounts.asset_protection_role
            .as_ref()
            .map(|role_account| role_account.user == signer_key && role_account.role == Role::AssetProtector)
            .unwrap_or(false);
            
        require!(
            has_enum_role || is_main_admin,
            GatekeeperError::Unauthorized
        );
        
        // The blacklist entry account is created by the #[account(init)] constraint
        // We just need to ensure it's properly initialized
        msg!("Address {} added to blacklist", ctx.accounts.target_address.key());
        Ok(())
    }
    
    /// Remove an address from the blacklist
    pub fn remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
        // Check if user has AssetProtector role
        let signer_key = ctx.accounts.authority.key();
        let is_main_admin = signer_key == ctx.accounts.config.admin;
        let has_enum_role = ctx.accounts.asset_protection_role
            .as_ref()
            .map(|role_account| role_account.user == signer_key && role_account.role == Role::AssetProtector)
            .unwrap_or(false);
            
        require!(
            has_enum_role || is_main_admin,
            GatekeeperError::Unauthorized
        );
        
        // The blacklist entry account is closed by the #[account(close)] constraint
        msg!("Address removed from blacklist");
        Ok(())
    }

    /// Add asset protector role to a user (admin only)
    pub fn add_role(ctx: Context<AddRole>, user: Pubkey, role: Role) -> Result<()> {
        let authority_key = ctx.accounts.admin.key();
        let is_main_admin = authority_key == ctx.accounts.config.admin;
        let has_default_admin = ctx.accounts.default_admin_role
            .as_ref()
            .map(|r| r.user == authority_key && r.role == Role::DefaultAdmin)
            .unwrap_or(false);
        require!( is_main_admin || has_default_admin, GatekeeperError::Unauthorized);
        let user_role = &mut ctx.accounts.user_role;
        user_role.user = user;
        user_role.role = role.clone();
        Ok(())
    }
    
    /// Remove role from a user (admin only)
    pub fn remove_role(ctx: Context<RemoveRole>, user: Pubkey, role: Role) -> Result<()> {
        let authority_key = ctx.accounts.admin.key();
        let is_main_admin = authority_key == ctx.accounts.config.admin;
        let has_default_admin = ctx.accounts.default_admin_role
            .as_ref()
            .map(|r| r.user == authority_key && r.role == Role::DefaultAdmin)
            .unwrap_or(false);

            require!(is_main_admin || has_default_admin, GatekeeperError::Unauthorized);
        // PDA account will be closed automatically due to close constraint
        Ok(())
    }


    /// The main transfer hook execution function
    pub fn transfer_hook(ctx: Context<TransferHook>, _amount: u64) -> Result<()> {
        // Validate that the owner matches the source token account owner
        require_keys_eq!(
            ctx.accounts.owner.key(),
            ctx.accounts.source_token.owner,
            GatekeeperError::Unauthorized
        );
    
        // Check if source blacklist PDA exists and has data (meaning the address is blacklisted)
        if ctx.accounts.source_blacklist_entry.data_len() >= 8 { // Has discriminator = blacklisted
            return err!(GatekeeperError::AddressBlacklisted);
        }
    
        // Check if destination blacklist PDA exists and has data
        if ctx.accounts.destination_blacklist_entry.data_len() >= 8 { // Has discriminator = blacklisted
            return err!(GatekeeperError::AddressBlacklisted);
        }
        
        // Check if the transfer amount exceeds the non-delegated portion
        // Users can only transfer tokens that are NOT delegated for redemption  
        // IMPORTANT: The transfer hook is called DURING transfer execution, so the token account
        // balance already has the transfer amount deducted. We need to add it back to get
        // the actual pre-transfer balance for validation.
        let actual_balance = ctx.accounts.source_token.amount.checked_add(_amount).unwrap_or(ctx.accounts.source_token.amount);
        let available_for_transfer = actual_balance.saturating_sub(ctx.accounts.source_token.delegated_amount);
        
        // Only block transfers that exceed the available non-delegated amount
        if _amount > available_for_transfer {
            return err!(GatekeeperError::InsufficientAvailableTokens);
        }
        Ok(())
    }

    /// Fallback function to handle transfer hook instructions
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;
        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => return Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}

/// Initialize extra account meta list
#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: ExtraAccountMetaList Account, must use these seeds
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: AccountInfo<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

/// Initialize the gatekeeper configuration
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Admin can be any account
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32, // discriminator + admin pubkey
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}



/// Add an address to the blacklist
#[derive(Accounts)]
pub struct AddToBlacklist<'info> {
    #[account(
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: The address being blacklisted
    pub target_address: AccountInfo<'info>,
    #[account(
        init,
        payer = authority,
        space = 8, // Just the discriminator
        seeds = [b"blacklist", mint.key().as_ref(), target_address.key().as_ref()],
        bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
    pub mint: InterfaceAccount<'info, Mint>,
    /// Optional: Role account for enum-based access
    #[account(
        seeds = [b"user_role", mint.key().as_ref(), authority.key().as_ref(), &[Role::AssetProtector as u8]],
        bump
    )]
    pub asset_protection_role: Option<Account<'info, UserRole>>,
    pub system_program: Program<'info, System>,
}

/// Remove an address from the blacklist
#[derive(Accounts)]
pub struct RemoveFromBlacklist<'info> {
    #[account(
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: The address being removed from blacklist
    pub target_address: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"blacklist", mint.key().as_ref(), target_address.key().as_ref()],
        bump,
        close = authority
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
    pub mint: InterfaceAccount<'info, Mint>,
    /// Optional: Role account for enum-based access
    #[account(
        seeds = [b"user_role", mint.key().as_ref(), authority.key().as_ref(), &[Role::AssetProtector as u8]],
        bump
    )]
    pub asset_protection_role: Option<Account<'info, UserRole>>,
}

/// Add asset protector role to a user (admin only)
#[derive(Accounts)]
#[instruction(user: Pubkey, role: Role)]
pub struct AddRole<'info> {
    #[account(
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 1, // discriminator + pubkey + role enum
        seeds = [b"user_role", mint.key().as_ref(), user.as_ref(), &[role.clone() as u8]],
        bump
    )]
    pub user_role: Account<'info, UserRole>,
    /// Optional: Role account for checking if admin has DefaultAdmin role
    #[account(
        seeds = [b"user_role", mint.key().as_ref(), admin.key().as_ref(), &[Role::DefaultAdmin as u8]],
        bump
    )]
    pub default_admin_role: Option<Account<'info, UserRole>>,
    pub system_program: Program<'info, System>,
}

/// Remove role from a user (admin only) - Generic for any role type
#[derive(Accounts)]
#[instruction(user: Pubkey, role: Role)]
pub struct RemoveRole<'info> {
    #[account(
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [b"user_role", mint.key().as_ref(), user.as_ref(), &[role as u8]],
        bump,
        close = admin
    )]
    pub user_role: Account<'info, UserRole>,
    /// Optional: Role account for checking if admin has DefaultAdmin role
    #[account(
        seeds = [b"user_role", mint.key().as_ref(), admin.key().as_ref(), &[Role::DefaultAdmin as u8]],
        bump
    )]
    pub default_admin_role: Option<Account<'info, UserRole>>,
}


/// Context for the transfer hook execution
#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(token::mint = mint)]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(token::mint = mint)]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: source token account owner - this should match source_token.owner
    pub owner: UncheckedAccount<'info>,
    /// CHECK: ExtraAccountMetaList Account
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    /// CHECK: Source blacklist PDA - this account may not exist (which is OK)
    pub source_blacklist_entry: UncheckedAccount<'info>,
    /// CHECK: Destination blacklist PDA - this account may not exist (which is OK)
    pub destination_blacklist_entry: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SetAdmin<'info> {
    #[account(mut, has_one = admin, seeds = [b"config", mint.key().as_ref()], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
}
/// Configuration account for the gatekeeper
#[account]
pub struct Config {
    pub admin: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum Role {
    SupplyController,
    AssetProtector,
    FeeController,
    DefaultAdmin,
}

#[account]
pub struct UserRole {
    pub user: Pubkey,
    pub role: Role,
}

/// Empty account that marks an address as blacklisted
#[account]
pub struct BlacklistEntry {}

#[error_code]
pub enum GatekeeperError {
    #[msg("The address is on the transfer blacklist.")]
    AddressBlacklisted,
    #[msg("Unauthorized: The signer is not the configured authority.")]
    Unauthorized,
    #[msg("Transfer amount exceeds available non-delegated tokens.")]
    InsufficientAvailableTokens,
}