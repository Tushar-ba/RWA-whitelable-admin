use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{
        burn, mint_to, approve, revoke, set_authority,
        Burn, MintTo, Approve, Revoke, SetAuthority, Token2022,
    },
    token_interface::{
        Mint, TokenAccount,
    },
};

use transfer_hook_gatekeeper::program::TransferHookGatekeeper;

declare_id!("3teuujqputEYdvTTLK6eoYygKF2EWDdgFVFGQoce3mc3");

#[program]
pub mod silver_token {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {


        let config = &mut ctx.accounts.config;
        config.admin = *ctx.accounts.admin.key;
        config.mint = ctx.accounts.mint.key();
        config.gatekeeper_program = *ctx.accounts.gatekeeper_program.key;
        config.redemption_request_counter = 0;
        config.is_paused = false;
        // Role access handled via separate PDA accounts
    
        let cpi_program = ctx.accounts.gatekeeper_program.to_account_info();
        let cpi_accounts = transfer_hook_gatekeeper::cpi::accounts::Initialize {
            payer: ctx.accounts.admin.to_account_info(),
            admin: ctx.accounts.admin.to_account_info(),
            config: ctx.accounts.gatekeeper_config.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer_hook_gatekeeper::cpi::initialize(cpi_ctx)?;

        let cpi_accounts = transfer_hook_gatekeeper::cpi::accounts::InitializeExtraAccountMetaList {
            payer: ctx.accounts.admin.to_account_info(),
            extra_account_meta_list: ctx.accounts.extra_account_meta_list.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.gatekeeper_program.to_account_info(), cpi_accounts);
        transfer_hook_gatekeeper::cpi::initialize_extra_account_meta_list(cpi_ctx)?;
    
        emit!(TokenInitialized {
            mint: ctx.accounts.mint.key(),
            admin: *ctx.accounts.admin.key,
            gatekeeper_program: *ctx.accounts.gatekeeper_program.key,
            name: name.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
        });
    
        Ok(())
    }


    pub fn toggle_pause(ctx: Context<TogglePause>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.is_paused = !config.is_paused;
        
        emit!(PauseToggled {
            is_paused: config.is_paused,
            authority: *ctx.accounts.admin.key,
        });
        Ok(())
    }


    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64, recipient: Pubkey) -> Result<()> {
        require!(amount > 0, SilverTokenError::InvalidAmount);
        require!(!ctx.accounts.config.is_paused, SilverTokenError::ContractPaused);
        
        let signer_key = ctx.accounts.admin.key();
        let role_account = &ctx.accounts.supply_controller_role;
        require!(
            role_account.user == signer_key && role_account.role == Role::SupplyController,
            SilverTokenError::Unauthorized
        );
        
        let seeds = &["mint_authority".as_bytes(), &[ctx.bumps.mint_authority_pda]];
        let signer = &[&seeds[..]];
        
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority_pda.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        emit!(TokensMinted {
            mint: ctx.accounts.mint.key(),
            to: ctx.accounts.recipient_token_account.key(),
            amount,
            authority: *ctx.accounts.mint_authority_pda.key,
            recipient,
        });

        Ok(())
    }

    pub fn request_redemption(ctx: Context<RequestRedemption>, amount: u64) -> Result<()> {
        require!(amount > 0, SilverTokenError::InvalidAmount);
        require!(!ctx.accounts.config.is_paused, SilverTokenError::ContractPaused);
        
        require!(
            ctx.accounts.user_token_account.amount >= amount,
            SilverTokenError::InsufficientBalance
        );
        let available_tokens = ctx.accounts.user_token_account.amount
            .saturating_sub(ctx.accounts.user_token_account.delegated_amount);
        require!(
            available_tokens >= amount,
            SilverTokenError::InsufficientAvailableTokens
        );
        
        let request_id = ctx.accounts.config.redemption_request_counter
            .checked_add(1)
            .ok_or(SilverTokenError::CounterOverflow)?;
        
        let request = &mut ctx.accounts.redemption_request;
        request.user = *ctx.accounts.user.key;
        request.amount = amount;
        request.status = RedemptionStatus::Pending;
        request.requested_at = Clock::get()?.unix_timestamp;
        request.completed_at = 0;
        request.request_id = request_id;
        request.redemption_pda_bump = ctx.bumps.redemption_pda;
        
        approve(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Approve {
                    to: ctx.accounts.user_token_account.to_account_info(),
                    delegate: ctx.accounts.redemption_pda.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;
        
        ctx.accounts.config.redemption_request_counter = request_id;

        emit!(RedemptionRequested {
            user: *ctx.accounts.user.key,
            request_id,
            amount,
            timestamp: request.requested_at,
        });

        Ok(())
    }

    pub fn fulfill_redemption(ctx: Context<FulfillRedemption>) -> Result<()> {
        let signer_key = ctx.accounts.admin.key();
        let is_paused = ctx.accounts.config.is_paused;
        let role_account = &ctx.accounts.supply_controller_role;
        require!(
            role_account.user == signer_key && role_account.role == Role::SupplyController,
            SilverTokenError::Unauthorized
        );
        
        let request = &mut ctx.accounts.redemption_request;
        require!(
            !is_paused && request.status == RedemptionStatus::Processing,
            SilverTokenError::InvalidRequestStatus
        );
        
        let seeds = &[
            b"redemption_pda",
            request.user.as_ref(),
            &request.request_id.to_le_bytes(),
            &[request.redemption_pda_bump]
        ];
        let signer = &[&seeds[..]];
        
        burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.redemption_pda.to_account_info(),
                },
                signer,
            ),
            request.amount,
        )?;
        
        request.status = RedemptionStatus::Fulfilled;
        request.completed_at = Clock::get()?.unix_timestamp;

        emit!(RedemptionFulfilled {
            user: request.user,
            request_id: request.request_id,
            amount: request.amount,
            timestamp: request.completed_at,
        });

        Ok(())
    }
    pub fn cancel_redemption(ctx: Context<CancelRedemption>) -> Result<()> {
        let request = &mut ctx.accounts.redemption_request;
        require!(request.status == RedemptionStatus::Pending, SilverTokenError::InvalidRequestStatus);
        
        let signer_key = ctx.accounts.user.key();
        let is_own_request = signer_key == request.user;
        
        let has_supply_role = ctx.accounts.supply_controller_role
            .as_ref()
            .map(|role_account| role_account.user == signer_key && role_account.role == Role::SupplyController)
            .unwrap_or(false);
            
        require!(
            is_own_request || has_supply_role,
            SilverTokenError::Unauthorized
        );
   
        // ALWAYS revoke the approval using the redemption PDA (which has delegated authority)
        let seeds = &[
            b"redemption_pda",
            request.user.as_ref(),
            &request.request_id.to_le_bytes(),
            &[request.redemption_pda_bump]
        ];
        let signer = &[&seeds[..]];
        
        revoke(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Revoke {
                source: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.redemption_pda.to_account_info(),
            },
            signer,
        ))?;
        request.status = RedemptionStatus::Cancelled;
        request.completed_at = Clock::get()?.unix_timestamp;
    
        emit!(RedemptionCancelled {
            user: request.user,
            request_id: request.request_id,
            amount: request.amount,
            timestamp: request.completed_at,
            cancelled_by: signer_key,
        });
    
        Ok(())
    }

    pub fn set_redemption_processing(ctx: Context<UpdateRedemptionStatus>) -> Result<()> {
        let signer_key = ctx.accounts.admin.key();
        let role_account = &ctx.accounts.supply_controller_role;
        require!(
            role_account.user == signer_key && role_account.role == Role::SupplyController,
            SilverTokenError::Unauthorized
        );

        let request = &mut ctx.accounts.redemption_request;
        require!(request.status == RedemptionStatus::Pending, SilverTokenError::InvalidRequestStatus);
        request.status = RedemptionStatus::Processing;

        emit!(RedemptionStatusUpdated {
            user: request.user,
            request_id: request.request_id,
            old_status: RedemptionStatus::Pending,
            new_status: RedemptionStatus::Processing,
        });

        Ok(())
    }

    pub fn add_role(ctx: Context<AddRole>, user: Pubkey, role: Role) -> Result<()> {
        let authority_key = ctx.accounts.authority.key();
        let is_main_admin = authority_key == ctx.accounts.config.admin;
        let has_default_admin = ctx.accounts.default_admin_role
            .as_ref()
            .map(|r| r.user == authority_key && r.role == Role::DefaultAdmin)
            .unwrap_or(false);
        require!(is_main_admin || has_default_admin, SilverTokenError::Unauthorized);

        let user_role = &mut ctx.accounts.user_role;
        user_role.user = user;
        user_role.role = role.clone();
        
        emit!(RoleAssigned {
            user,
            role: format!("{:?}", role),
            authority: authority_key,
        });
        
        Ok(())
    }

    pub fn remove_role(ctx: Context<RemoveRole>, user: Pubkey, role: Role) -> Result<()> {
        let authority_key = ctx.accounts.authority.key();
        let has_default_admin = ctx.accounts.default_admin_role
            .as_ref()
            .map(|r| r.user == authority_key && r.role == Role::DefaultAdmin)
            .unwrap_or(false);
        require!(has_default_admin, SilverTokenError::Unauthorized);

        emit!(RoleRemoved {
            user,
            role: format!("{:?}", role),
            authority: authority_key,
        });
        
        Ok(())
    }

    pub fn set_admin(ctx: Context<SetAdmin>, admin: Pubkey) -> Result<()> {
        let authority_key = ctx.accounts.admin.key();
        require!(authority_key == ctx.accounts.config.admin, SilverTokenError::Unauthorized);
        ctx.accounts.config.admin = admin;
        emit!(AdminSet { admin });
        Ok(())
    }

    pub fn wipe_blacklisted_address(ctx: Context<WipeAddress>, amount: u64) -> Result<()> {
        require!(amount > 0, SilverTokenError::InvalidAmount);
        
        let signer_key = ctx.accounts.admin.key();
        let role_account = &ctx.accounts.asset_protection_role;
        require!(
            role_account.user == signer_key && role_account.role == Role::AssetProtector,
            SilverTokenError::Unauthorized
        );
        
        require!(
            ctx.accounts.blacklist_entry.lamports() > 0,
            SilverTokenError::AddressNotBlacklisted
        );
        
        require!(
            ctx.accounts.target_token_account.amount >= amount,
            SilverTokenError::InsufficientBalance
        );
        
        let asset_protection_seeds = &[
            b"asset_protection".as_ref(),
            &[ctx.bumps.asset_protection_pda]
        ];
        let asset_protection_signer = &[&asset_protection_seeds[..]];
        
        burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.target_token_account.to_account_info(),
                    authority: ctx.accounts.asset_protection_pda.to_account_info(),
                },
                asset_protection_signer,
            ),
            amount,
        )?;

        emit!(TokensWiped {
            target_user: *ctx.accounts.target_user.key,
            amount,
            authority: *ctx.accounts.asset_protection_pda.key,
        });

        Ok(())
    }

    /// Transfer mint authority from PDA back to a new authority (admin only)
    pub fn transfer_mint_authority(ctx: Context<TransferMintAuthority>, new_authority: Pubkey) -> Result<()> {
        // Only the main admin can transfer mint authority
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            SilverTokenError::Unauthorized
        );

        let mint_authority_seeds = &[
            b"mint_authority".as_ref(),
            &[ctx.bumps.mint_authority_pda]
        ];
        let signer_seeds = &[&mint_authority_seeds[..]];

        // Transfer mint authority from PDA to new authority
        set_authority(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: ctx.accounts.mint_authority_pda.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
                signer_seeds,
            ),
            anchor_spl::token_2022::spl_token_2022::instruction::AuthorityType::MintTokens,
            Some(new_authority),
        )?;

        emit!(AuthorityTransferred {
            authority_type: "MintTokens".to_string(),
            old_authority: ctx.accounts.mint_authority_pda.key(),
            new_authority,
            transferred_by: ctx.accounts.admin.key(),
        });

        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub gatekeeper_program: Program<'info, TransferHookGatekeeper>,

    #[account(
        init, 
        payer = admin, 
        space = 8 + 32* 3 + 8 + 1, 
        seeds = [b"config"], 
        bump
    )]
    pub config: Account<'info, Config>,

    /// CHECK: This is the config account for the gatekeeper program.
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump,
        seeds::program = gatekeeper_program
    )]
    pub gatekeeper_config: AccountInfo<'info>,

    /// CHECK: ExtraAccountMetaList account for the transfer hook
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
        seeds::program = gatekeeper_program
    )]
    pub extra_account_meta_list: AccountInfo<'info>,

    /// CHECK: Existing mint account with extensions already initialized
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(seeds = [b"mint_authority"], bump, seeds::program = crate::ID)]
    /// CHECK: This is a PDA.
    pub mint_authority_pda: AccountInfo<'info>,

    #[account(seeds = [b"asset_protection"], bump, seeds::program = crate::ID)]
    /// CHECK: This is a PDA.
    pub asset_protection_pda: AccountInfo<'info>,

    #[account(seeds = [b"supply_controller"], bump, seeds::program = crate::ID)]
    /// CHECK: This is a PDA.
    pub supply_controller_pda: AccountInfo<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TogglePause<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey, role: Role)]
pub struct AddRole<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1, // discriminator + pubkey + role enum
        seeds = [b"user_role", user.as_ref(), &[role as u8]],
        bump
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(
        seeds = [b"user_role", authority.key().as_ref(), &[Role::DefaultAdmin as u8]],
        bump
    )]
    pub default_admin_role: Option<Account<'info, UserRole>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey, role: Role)]
pub struct RemoveRole<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = authority,
        seeds = [b"user_role", user.as_ref(), &[role as u8]],
        bump
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(
        seeds = [b"user_role", authority.key().as_ref(), &[Role::DefaultAdmin as u8]],
        bump
    )]
    pub default_admin_role: Option<Account<'info, UserRole>>,
}

#[derive(Accounts)]
#[instruction(amount: u64, recipient: Pubkey)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, address = config.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(seeds = [b"mint_authority"], bump, seeds::program = crate::ID)]
    /// CHECK: PDA mint authority.
    pub mint_authority_pda: AccountInfo<'info>,
    /// CHECK: Recipient account for token minting, validated through associated token account constraints
    pub recipient: AccountInfo<'info>,
    
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = recipient,
        associated_token::token_program = token_program,
    )]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,
    
    /// Required: Role account for enum-based access
    #[account(
        seeds = [b"user_role", admin.key().as_ref(), &[Role::SupplyController as u8]],
        bump
    )]
    pub supply_controller_role: Account<'info, UserRole>, 
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct RequestRedemption<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, has_one = mint)]
    pub config: Account<'info, Config>,
    #[account(
        init, 
        payer = user, 
        space = 8 + 32 + 8 + 1 + 8 + 8 + 8 + 1, // discriminator + user + amount + status + timestamps + request_id + bump
        seeds = [b"redemption_request", user.key().as_ref(), &config.redemption_request_counter.checked_add(1).unwrap().to_le_bytes()], 
        bump
    )]
    pub redemption_request: Account<'info, RedemptionRequest>,
    #[account(mut, token::mint = mint, token::authority = user)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = config.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut, 
        seeds = [b"redemption_pda", user.key().as_ref(), &config.redemption_request_counter.checked_add(1).unwrap().to_le_bytes()], 
        bump,
        seeds::program = crate::ID
    )]
    /// CHECK: PDA that will own the escrowed tokens.
    pub redemption_pda: AccountInfo<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FulfillRedemption<'info> {
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, close = admin, has_one = user)]
    pub redemption_request: Account<'info, RedemptionRequest>,
    #[account(mut, address = config.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    /// CHECK: The user who made the request.
    #[account(mut)]
    pub user: AccountInfo<'info>,
    #[account(mut, token::mint = mint, token::authority = user)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"redemption_pda", user.key().as_ref(), &redemption_request.request_id.to_le_bytes()], 
        bump = redemption_request.redemption_pda_bump,
        seeds::program = crate::ID
    )]
    /// CHECK: PDA that owns the escrowed tokens.
    pub redemption_pda: AccountInfo<'info>,
    #[account(
        seeds = [b"mint_authority"],
        bump,
        seeds::program = crate::ID
    )]
    /// CHECK: This is a PDA.
    pub mint_authority_pda: AccountInfo<'info>,
    /// Required: Role account for supply controller access
    #[account(
        seeds = [b"user_role", admin.key().as_ref(), &[Role::SupplyController as u8]],
        bump
    )]
    pub supply_controller_role: Account<'info, UserRole>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct CancelRedemption<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut, close = user)]
    pub redemption_request: Account<'info, RedemptionRequest>,
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    // ADD THIS NEW ACCOUNT:
    #[account(
        mut,
        seeds = [b"redemption_pda", redemption_request.user.as_ref(), &redemption_request.request_id.to_le_bytes()], 
        bump = redemption_request.redemption_pda_bump,
        seeds::program = crate::ID
    )]
    /// CHECK: PDA that was delegated authority over the tokens
    pub redemption_pda: AccountInfo<'info>,
    
    /// Optional: Role account for supply controller access (only needed if not own request)
    #[account(
        seeds = [b"user_role", user.key().as_ref(), &[Role::SupplyController as u8]],
        bump
    )]
    pub supply_controller_role: Option<Account<'info, UserRole>>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct UpdateRedemptionStatus<'info> {
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub redemption_request: Account<'info, RedemptionRequest>,
    /// Required: Role account for supply controller access
    #[account(
        seeds = [b"user_role", admin.key().as_ref(), &[Role::SupplyController as u8]],
        bump
    )]
    pub supply_controller_role: Account<'info, UserRole>,
}


#[derive(Accounts)]
pub struct WipeAddress<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(mut, address = config.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    /// CHECK: The user whose tokens are being wiped.
    pub target_user: AccountInfo<'info>,
    #[account(mut, token::mint = mint, token::authority = target_user)]
    pub target_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        seeds = [b"blacklist", config.mint.key().as_ref(), target_user.key().as_ref()], 
        bump, 
        seeds::program = config.gatekeeper_program
    )]
    /// CHECK: The PDA marker account for the blacklist entry.
    pub blacklist_entry: UncheckedAccount<'info>,
    #[account(
        seeds = [b"asset_protection"],
        bump,
        seeds::program = crate::ID
    )]
    /// CHECK: This is a PDA.
    pub asset_protection_pda: AccountInfo<'info>,
    /// Required: Role account for enum-based access
    #[account(
        seeds = [b"user_role", admin.key().as_ref(), &[Role::AssetProtector as u8]],
        bump
    )]
    pub asset_protection_role: Account<'info, UserRole>,
    pub gatekeeper_program: Program<'info, TransferHookGatekeeper>,
    pub token_program: Program<'info, Token2022>,
}

 #[derive(Accounts)]
 pub struct SetAdmin<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [b"user_role", admin.key().as_ref(), &[Role::DefaultAdmin as u8]],
        seeds::program = crate::ID,
        bump
    )]
    pub default_admin_role: Account<'info, UserRole>,
 }

/// Transfer mint authority from PDA back to a new authority
#[derive(Accounts)]
pub struct TransferMintAuthority<'info> {
    #[account(has_one = admin)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, address = config.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [b"mint_authority"],
        bump,
        seeds::program = crate::ID
    )]
    /// CHECK: Current mint authority PDA
    pub mint_authority_pda: AccountInfo<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
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

#[account]
#[derive(Default)]
pub struct Config {
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub gatekeeper_program: Pubkey,
    pub redemption_request_counter: u64,
    pub is_paused: bool,
}

#[account]
pub struct RedemptionRequest {
    pub user: Pubkey,
    pub amount: u64,
    pub status: RedemptionStatus,
    pub requested_at: i64,
    pub completed_at: i64,
    pub request_id: u64,
    pub redemption_pda_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RedemptionStatus {
    Pending,
    Processing,
    Fulfilled,
    Cancelled,
}

#[event]
pub struct TokenInitialized {
    pub mint: Pubkey,
    pub admin: Pubkey,
    pub gatekeeper_program: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[event]
pub struct RoleUpdated {
    pub role: String,
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
}

#[event]
pub struct PauseToggled {
    pub is_paused: bool,
    pub authority: Pubkey,
}

#[event]
pub struct TokensMinted {
    pub mint: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub authority: Pubkey,
    pub recipient: Pubkey,
}

#[event]
pub struct RedemptionRequested {
    pub user: Pubkey,
    pub request_id: u64,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RedemptionFulfilled {
    pub user: Pubkey,
    pub request_id: u64,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RedemptionCancelled {
    pub user: Pubkey,
    pub request_id: u64,
    pub amount: u64,
    pub timestamp: i64,
    pub cancelled_by: Pubkey,
}

#[event]
pub struct RedemptionStatusUpdated {
    pub user: Pubkey,
    pub request_id: u64,
    pub old_status: RedemptionStatus,
    pub new_status: RedemptionStatus,
}

#[event]
pub struct TokensWiped {
    pub target_user: Pubkey,
    pub amount: u64,
    pub authority: Pubkey,
}

#[event]
pub struct WithheldTokensWithdrawn {
    pub mint: Pubkey,
    pub destination: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct RoleAssigned {
    pub user: Pubkey,
    pub role: String,
    pub authority: Pubkey,
}

#[event]
pub struct RoleRemoved {
    pub user: Pubkey,
    pub role: String,
    pub authority: Pubkey,
}

#[event]
pub struct AdminSet {
    pub admin: Pubkey,
}

#[event]
pub struct AuthorityTransferred {
    pub authority_type: String,
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub transferred_by: Pubkey,
}


#[error_code]
pub enum SilverTokenError {
    #[msg("Invalid amount.")]
    InvalidAmount,
    #[msg("Contract is paused.")]
    ContractPaused,
    #[msg("Invalid redemption request status for this action.")]
    InvalidRequestStatus,
    #[msg("Address is not on the blacklist.")]
    AddressNotBlacklisted,
    #[msg("Counter overflow.")]
    CounterOverflow,
    #[msg("Insufficient token balance.")]
    InsufficientBalance,
    #[msg("Unauthorized access.")]
    Unauthorized,
    #[msg("Insufficient available tokens (some may be delegated for redemption).")]
    InsufficientAvailableTokens,
}