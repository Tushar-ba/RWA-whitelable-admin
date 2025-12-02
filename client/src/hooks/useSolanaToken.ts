import { useMemo } from "react";
import { Connection, Transaction } from "@solana/web3.js";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { Program, AnchorProvider, Idl, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import goldIdl from "../constant/goldToken.json";
import silverIdl from "../constant/silver_token.json";
import gatekeeperIdl from "../constant/transfer_hook_gatekeeper.json";
import { toast } from "./use-toast";
import apiRequest from "@/lib/apiClient";
// import { PROGRAM_ID } from '../utils/constants';

// Program IDs for both tokens
// Fallback to known IDs if env vars are missing so the app doesn't crash
const GOLD_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_GOLD_TOKEN_CONTRACT ||
    "4Abztzso97KPMy6fdexqNeVKqUUn2KF5aw6Vb99rV8qg",
);
const SILVER_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_SILVER_TOKEN_CONTRACT ||
    "3teuujqputEYdvTTLK6eoYygKF2EWDdgFVFGQoce3mc3",
);
const GATEKEEPER_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_SOLANA_GATEKEEPER_PROGRAM_ID ||
    "HPpSduHvXR6U26ZWPy9DRuASMzGnqis8EPKNxiHHbWJY",
);

// Keep legacy reference for backward compatibility
const PROGRAM_ID = GOLD_PROGRAM_ID;

export function useMemeTokenProgram(tokenType: string) {
  // Use Reown Kit hooks instead of Solana wallet adapter
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("solana");
  const chainId = "solana_devnet";
  const PROGRAM_ID = tokenType === "gold" ? GOLD_PROGRAM_ID : SILVER_PROGRAM_ID;
  const idl = tokenType === "gold" ? goldIdl : silverIdl;
  // Create connection (you might want to adjust the RPC endpoint based on your network)
  const connection = useMemo(() => {
    // Use appropriate RPC endpoint based on your network
    const rpcEndpoint = chainId?.includes("devnet")
      ? "https://api.devnet.solana.com"
      : "https://api.mainnet-beta.solana.com";
    return new Connection(rpcEndpoint, "confirmed");
  }, [chainId]);

  // Convert address string to PublicKey
  const publicKey = useMemo(() => {
    if (!address) return null;
    try {
      return new PublicKey(address);
    } catch (error) {
      console.error("Invalid public key:", error);
      return null;
    }
  }, [address]);

  const provider = useMemo(() => {
    if (!publicKey || !walletProvider || !isConnected) return null;

    // Create a wallet-like interface for AnchorProvider
    const walletInterface = {
      publicKey,
      signTransaction: async (transaction: any) => {
        if (!(walletProvider as any).signTransaction) {
          throw new Error("Wallet does not support transaction signing");
        }
        return await (walletProvider as any).signTransaction(transaction);
      },
      signAllTransactions: async (transactions: any[]) => {
        if (!(walletProvider as any).signAllTransactions) {
          throw new Error("Wallet does not support batch transaction signing");
        }
        return await (walletProvider as any).signAllTransactions(transactions);
      },
    };

    return new AnchorProvider(connection, walletInterface as any, {
      commitment: "confirmed",
    });
  }, [connection, publicKey, walletProvider, isConnected]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as Idl, provider);
  }, [provider]);

  // Always create specific program instances for addRole function
  const goldProgram = useMemo(() => {
    if (!provider) return null;
    return new Program(goldIdl as Idl, provider);
  }, [provider]);

  const silverProgram = useMemo(() => {
    if (!provider) return null;
    return new Program(silverIdl as Idl, provider);
  }, [provider]);

  const gatekeeperBothProgram = useMemo(() => {
    if (!provider) return null;
    return new Program(gatekeeperIdl as Idl, provider);
  }, [provider]);

  const mintTokens = async (amount: number, recipientAddress: string) => {
    if (!program || !publicKey) {
      throw new Error("Wallet not connected or program not initialized");
    }

    // Check if we're on a Solana network
    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }

    const config = await getConfig();
    if (!config) {
      throw new Error("Could not fetch program config");
    }

    try {
      // Convert addresses to PublicKeys
      const recipientPublicKey = new PublicKey(recipientAddress);
      const mint = new PublicKey(config.mint);
      // Get the config PDA
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        PROGRAM_ID,
      );

      // Get the mint authority PDA
      const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        PROGRAM_ID,
      );

      // Get the supply controller PDA
      const [supplyControllerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("supply_controller")],
        PROGRAM_ID,
      );
      const [supplyControllerRolePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_role"),
          new PublicKey(address as string).toBuffer(),
          Buffer.from([0]), // Role::SupplyController = 0
        ],
        program.programId,
      );

      // Get the recipient's associated token account
      // const recipientTokenAccount = await getAssociatedTokenAddress(
      //   mint,
      //   recipientPublicKey
      // );
      const recipientTokenAccount = await getAssociatedTokenAddress(
        mint,
        recipientPublicKey,
        false, // allowOwnerOffCurve
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      // const tx = await program.methods
      // .mintTokens(amount, user2)
      // .accountsPartial({
      //   config: configAccount,
      //   admin: supplyController.publicKey, // Changed from supplyControllerAuthority to admin
      //   mint: mint,
      //   mintAuthorityPda: mintAuthorityPda, // Optional
      //   recipient: user2,
      //   recipientTokenAccount: recipientTokenAccount,
      //   supplyControllerRole: supplyControllerRolePda, // Required role PDA
      //   tokenProgram: TOKEN_2022_PROGRAM_ID,
      //   associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      //   systemProgram: anchor.web3.SystemProgram.programId,
      // })
      // .signers([supplyController])
      // .rpc();

      const tx = await program.methods
        .mintTokens(new BN(amount), recipientPublicKey) // Also use BN for amount
        .accounts({
          config: configPda, // ✅ Remove .toString()
          supplyControllerAuthority: publicKey, // ✅ Remove .toString()
          mint: mint, // ✅ Remove .toString()
          mintAuthorityPda: mintAuthorityPda, // ✅ Remove .toString()
          recipient: recipientPublicKey, // ✅ Remove .toString()
          recipientTokenAccount: recipientTokenAccount, // ✅ Remove .toString()
          supplyControllerRole: supplyControllerRolePda, // Required role PDA
          // supplyControllerPda: supplyControllerPda, // ✅ Remove .toString()
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Mint transaction successful:", tx);
      return {
        signature: tx,
        mint: mint.toString(),
        recipient: recipientPublicKey.toString(),
        recipientTokenAccount: recipientTokenAccount.toString(),
        amount: amount,
      };
    } catch (error) {
      console.error("Error minting tokens:", error);
      throw error;
    }
  };

  const initializeToken = async (
    name: string,
    symbol: string,
    uri: string,
    supplyControllerAuthority: string,
    assetProtectionAuthority: string,
    feeControllerAuthority: string,
    mintKeypair?: Keypair, // Optional, will generate if not provided
  ) => {
    console.log("Initializing token with params:", {
      name,
      symbol,
      uri,
    });

    if (!program || !publicKey) {
      throw new Error("Wallet not connected or program not initialized");
    }

    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }

    try {
      // Use provided keypair or generate new one
      const mint = mintKeypair || Keypair.generate();

      // Convert authority addresses to PublicKeys
      const supplyControllerAuthorityPubkey = new PublicKey(
        supplyControllerAuthority,
      );
      const assetProtectionAuthorityPubkey = new PublicKey(
        assetProtectionAuthority,
      );
      const feeControllerAuthorityPubkey = new PublicKey(
        feeControllerAuthority,
      );

      // Get PDAs
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        PROGRAM_ID,
      );

      const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        PROGRAM_ID,
      );

      const [feeControllerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("fee_controller")],
        PROGRAM_ID,
      );

      const [assetProtectionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("asset_protection")],
        PROGRAM_ID,
      );

      const [supplyControllerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("supply_controller")],
        PROGRAM_ID,
      );

      // Updated gatekeeper program address from new IDL
      const gatekeeperProgram = new PublicKey(
        "8gYoUBAnfQokn4SdHNqBX7oczLsyRzbn6LejyqF74Bwm",
      );

      // Get gatekeeper config PDA (based on new IDL structure)
      const [gatekeeperConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from("config"), mint.publicKey.toBuffer()],
        gatekeeperProgram,
      );

      // Get extra account meta list PDA for gatekeeper
      const [extraAccountMetaList] = PublicKey.findProgramAddressSync(
        [Buffer.from("extra-account-metas"), mint.publicKey.toBuffer()],
        gatekeeperProgram,
      );

      console.log("Preparing initialization transaction with accounts:", {
        admin: publicKey.toString(),
        supply_controller_authority: supplyControllerAuthorityPubkey.toString(),
        asset_protection_authority: assetProtectionAuthorityPubkey.toString(),
        fee_controller_authority: feeControllerAuthorityPubkey.toString(),
        gatekeeper_program: gatekeeperProgram.toString(),
        config: configPda.toString(),
        gatekeeper_config: gatekeeperConfig.toString(),
        extra_account_meta_list: extraAccountMetaList.toString(),
        mint: mint.publicKey.toString(),
      });

      const tx = await program.methods
        .initialize(name, symbol, uri)
        .accounts({
          admin: publicKey,
          supply_controller_authority: supplyControllerAuthorityPubkey,
          asset_protection_authority: assetProtectionAuthorityPubkey,
          fee_controller_authority: feeControllerAuthorityPubkey,
          gatekeeper_program: gatekeeperProgram,
          config: configPda,
          gatekeeper_config: gatekeeperConfig,
          extra_account_meta_list: extraAccountMetaList,
          mint: mint.publicKey,
          mint_authority_pda: mintAuthorityPda,
          fee_controller_pda: feeControllerPda,
          asset_protection_pda: assetProtectionPda,
          supply_controller_pda: supplyControllerPda,
          token_program: TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
        })
        .signers([mint])
        .rpc();

      console.log("Token initialization successful:", tx);
      return {
        signature: tx,
        mint: mint.publicKey.toString(),
        config: configPda.toString(),
      };
    } catch (error) {
      console.error("Error initializing token:", error);
      throw error;
    }
  };

  const getConfig = async () => {
    if (!program || !connection) return null;

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID,
    );

    try {
      const config = await (program.account as any).config.fetch(configPda);
      return {
        admin: config.admin.toString(),
        // supply_controller_authority: config.supplyControllerAuthority.toString(),
        // asset_protection_authority: config.assetProtectionAuthority.toString(),
        // fee_controller_authority: config.feeControllerAuthority.toString(),
        mint: config.mint.toString(),
        gatekeeper_program: config.gatekeeperProgram.toString(),
        redemption_request_counter: config.redemptionRequestCounter.toNumber(),
        is_paused: config.isPaused,
        configPda: configPda.toString(),
      };
    } catch (error) {
      console.error("Error fetching config:", error);
      return null;
    }
  };

  const requestRedemption = async (
    amount: number,
    userTokenAccount: string,
  ) => {
    if (!program || !publicKey) {
      throw new Error("Wallet not connected or program not initialized");
    }

    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }

    try {
      // Get config first to get the current counter
      const config = await getConfig();
      if (!config) {
        throw new Error("Could not fetch program config");
      }

      const mint = new PublicKey(config.mint);
      const userTokenAccountPubkey = new PublicKey(userTokenAccount);
      const configPda = new PublicKey(config.configPda);

      // Calculate the next request ID
      const nextRequestId = config.redemption_request_counter + 1;

      // Get PDAs
      const [redemptionRequestPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption_request"),
          publicKey.toBuffer(),
          Buffer.from(nextRequestId.toString().padStart(8, "0")), // Convert to bytes properly
        ],
        PROGRAM_ID,
      );

      const [redemptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption_pda"),
          publicKey.toBuffer(),
          Buffer.from(nextRequestId.toString().padStart(8, "0")), // Convert to bytes properly
        ],
        PROGRAM_ID,
      );

      console.log("Requesting redemption with params:", {
        user: publicKey.toString(),
        amount,
        config: configPda.toString(),
        redemption_request: redemptionRequestPda.toString(),
        user_token_account: userTokenAccountPubkey.toString(),
        mint: mint.toString(),
        redemption_pda: redemptionPda.toString(),
      });

      const tx = await program.methods
        .requestRedemption(new BN(amount))
        .accounts({
          user: publicKey,
          config: configPda,
          redemption_request: redemptionRequestPda,
          user_token_account: userTokenAccountPubkey,
          mint: mint,
          redemption_pda: redemptionPda,
          token_program: TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
        })
        .rpc();

      console.log("Redemption request successful:", tx);
      return {
        signature: tx,
        redemption_request: redemptionRequestPda.toString(),
        request_id: nextRequestId,
        amount,
      };
    } catch (error) {
      console.error("Error requesting redemption:", error);
      throw error;
    }
  };

  const cancelRedemption = async (
    nextRequestId: string,
    userAddress: string,
  ) => {
    if (!program || !publicKey) {
      throw new Error("Wallet not connected or program not initialized");
    }

    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }
    try {
      // Get config
      const config = await getConfig();
      if (!config) {
        throw new Error("Could not fetch program config");
      }
      const userWalletAddress = new PublicKey(userAddress);
      const [redemptionRequestPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption_request"), // This matches the const value in IDL
          userWalletAddress.toBuffer(), // user account
          // The counter seed should be the incremented value as u64 in little-endian
          Buffer.from(new BN(nextRequestId).toArrayLike(Buffer, "le", 8)),
        ],
        PROGRAM_ID,
      );

      const [redemptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption_pda"),
          userWalletAddress.toBuffer(),
          Buffer.from(new BN(nextRequestId).toArrayLike(Buffer, "le", 8)),
        ],
        PROGRAM_ID,
      );

      const configPda = new PublicKey(config.configPda);
      const mint = new PublicKey(config.mint);
      // const redemptionRequestPda = new PublicKey(redemptionRequestAddress);
      // const userTokenAccountPubkey = new PublicKey(userTokenAccount);
      const user = new PublicKey(userAddress);

      const [supplyControllerRolePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_role"),
          publicKey.toBuffer(),
          Buffer.from([0]), // Role::SupplyController = 0
        ],
        program.programId,
      );

      const recipientTokenAccount = getAssociatedTokenAddressSync(
        mint,
        userWalletAddress,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
      console.log("recipientTokenAccount", recipientTokenAccount.toBase58());

      const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        program.programId,
      );

      console.log("mintAuthorityPda", mintAuthorityPda.toBase58());
      const tx = await program.methods
        .cancelRedemption()
        .accounts({
          user: publicKey,
          config: configPda,
          redemptionRequest: redemptionRequestPda,
          userTokenAccount: recipientTokenAccount,
          redemptionPda: redemptionPda,
          supplyControllerRole: supplyControllerRolePda, // Supply controller role PDA
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      // const tx = await program.methods
      //   .fulfillRedemption()
      //   .accountsPartial({
      //     config: configPda,
      //     admin: publicKey, // Changed from supplyController to admin
      //     redemptionRequest: redemptionRequestPda,
      //     mint: mint,
      //     userTokenAccount: recipientTokenAccount,
      //     user: user,
      //     redemptionPda: redemptionPda,
      //     mintAuthorityPda: mintAuthorityPda,
      //     supplyControllerRole: supplyControllerRolePda,
      //     tokenProgram: TOKEN_2022_PROGRAM_ID,
      //   })
      //   .rpc();

      console.log("Redemption fulfillment successful:", tx);
      return {
        signature: tx,
        redemption_request: redemptionRequestPda.toString(),
        user: user.toString(),
      };
    } catch (error) {
      console.error("Error fulfilling redemption:", error);
      throw error;
    }
  };

  // NEW FUNCTION: Fulfill Redemption (Burn tokens)
  const fulfillRedemption = async (
    nextRequestId: string,
    userAddress: string,
  ) => {
    if (!program || !publicKey) {
      throw new Error("Wallet not connected or program not initialized");
    }

    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }
    try {
      // Get config
      const config = await getConfig();
      if (!config) {
        throw new Error("Could not fetch program config");
      }
      const userWalletAddress = new PublicKey(userAddress);
      const [redemptionRequestPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption_request"), // This matches the const value in IDL
          userWalletAddress.toBuffer(), // user account
          // The counter seed should be the incremented value as u64 in little-endian
          Buffer.from(new BN(nextRequestId).toArrayLike(Buffer, "le", 8)),
        ],
        PROGRAM_ID,
      );

      const [redemptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption_pda"),
          userWalletAddress.toBuffer(),
          Buffer.from(new BN(nextRequestId).toArrayLike(Buffer, "le", 8)),
        ],
        PROGRAM_ID,
      );

      const configPda = new PublicKey(config.configPda);
      const mint = new PublicKey(config.mint);
      // const redemptionRequestPda = new PublicKey(redemptionRequestAddress);
      // const userTokenAccountPubkey = new PublicKey(userTokenAccount);
      const user = new PublicKey(userAddress);

      const [supplyControllerRolePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_role"),
          publicKey.toBuffer(),
          Buffer.from([0]), // Role::SupplyController = 0
        ],
        program.programId,
      );

      const recipientTokenAccount = getAssociatedTokenAddressSync(
        mint,
        userWalletAddress,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
      console.log("recipientTokenAccount", recipientTokenAccount.toBase58());

      const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        program.programId,
      );

      console.log("mintAuthorityPda", mintAuthorityPda.toBase58());

      const tx = await program.methods
        .fulfillRedemption()
        .accountsPartial({
          config: configPda,
          admin: publicKey, // Changed from supplyController to admin
          redemptionRequest: redemptionRequestPda,
          mint: mint,
          userTokenAccount: recipientTokenAccount,
          user: user,
          redemptionPda: redemptionPda,
          mintAuthorityPda: mintAuthorityPda,
          supplyControllerRole: supplyControllerRolePda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      console.log("Redemption fulfillment successful:", tx);
      return {
        signature: tx,
        redemption_request: redemptionRequestPda.toString(),
        user: user.toString(),
      };
    } catch (error) {
      console.error("Error fulfilling redemption:", error);
      throw error;
    }
  };

  // NEW FUNCTION: Set Redemption Processing Status
  const setRedemptionProcessing = async (
    nextRequestId: string,
    walletAddress: string,
  ) => {
    if (!program || !publicKey) {
      throw new Error("Wallet not connected or program not initialized");
    }

    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }

    try {
      // Get config
      const config = await getConfig();
      if (!config) {
        throw new Error("Could not fetch program config");
      }

      const configPda = new PublicKey(config.configPda);
      console.log("add", walletAddress);
      const userWalletAddress = new PublicKey(walletAddress);
      const [redemptionRequestPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("redemption_request"), // This matches the const value in IDL
          userWalletAddress.toBuffer(), // user account
          // The counter seed should be the incremented value as u64 in little-endian
          Buffer.from(new BN(nextRequestId).toArrayLike(Buffer, "le", 8)),
        ],
        PROGRAM_ID,
      );
      const [supplyControllerRolePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_role"),
          publicKey.toBuffer(),
          Buffer.from([0]), // Role::SupplyController = 0
        ],
        program.programId,
      );

      // const account = await (program.account as any).redemptionRequest.fetch(redemptionRequestPda);
      // const userTokenAccountPubkey = redemptionRequestPda.toBase58();
      // const redemptionRequestPda = new PublicKey(redemptionRequestAddress);

      console.log("Setting redemption processing status with params:", {
        config: configPda.toString(),
        supplyControllerRolePda: supplyControllerRolePda,
        admin: publicKey.toBuffer(),
        redemption_request: redemptionRequestPda.toString(),
      });

      const tx = await program.methods
        .setRedemptionProcessing()
        .accounts({
          config: configPda,
          admin: publicKey,
          redemptionRequest: redemptionRequestPda,
          supplyControllerRole: supplyControllerRolePda,
        })
        .rpc();

      console.log("Set redemption processing successful:", tx);
      return {
        signature: tx,
        redemption_request: redemptionRequestPda.toString(),
      };
    } catch (error) {
      console.error("Error setting redemption processing:", error);
      throw error;
    }
  };

  // NEW FUNCTION: Get Redemption Request
  const getRedemptionRequest = async (redemptionRequestAddress: string) => {
    if (!program) return null;

    try {
      const redemptionRequestPda = new PublicKey(redemptionRequestAddress);
      const redemptionRequest = await (
        program.account as any
      ).redemptionRequest.fetch(redemptionRequestPda);

      return {
        user: redemptionRequest.user.toString(),
        amount: redemptionRequest.amount.toNumber(),
        status: redemptionRequest.status,
        requested_at: redemptionRequest.requestedAt.toNumber(),
        completed_at: redemptionRequest.completedAt.toNumber(),
        request_id: redemptionRequest.requestId.toNumber(),
        redemption_pda_bump: redemptionRequest.redemptionPdaBump,
      };
    } catch (error) {
      console.error("Error fetching redemption request:", error);
      return null;
    }
  };

  // NEW FUNCTION: Set Transfer Fee for both Gold and Silver tokens (bundled transaction)
  const setTransferFee = async (
    transferFeeBasisPoints: number,
    maximumFee: number,
  ) => {
    if (!program || !silverProgram || !publicKey) {
      throw new Error("Wallet not connected or programs not initialized");
    }

    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }

    try {
      // GOLD TOKEN - Derive config PDA for gold token
      const [goldConfigAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        GOLD_PROGRAM_ID
      );

      // Get gold config to retrieve mint address
      const goldConfig = await getConfig();
      if (!goldConfig) {
        throw new Error("Could not fetch gold program config");
      }

      const goldMint = new PublicKey(goldConfig.mint);

      // Get gold fee controller and role PDAs
      const [goldFeeControllerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("fee_controller")],
        GOLD_PROGRAM_ID,
      );

      const [goldFeeControllerRolePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_role"),
          publicKey.toBuffer(),
          Buffer.from([2]) // Role::FeeController = 2
        ],
        GOLD_PROGRAM_ID,
      );

      // SILVER TOKEN - Derive config PDA for silver token
      const [silverConfigAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        SILVER_PROGRAM_ID
      );

      // Get silver config to retrieve mint address
      const silverConfig = await (silverProgram.account as any).config.fetch(silverConfigAccount);
      if (!silverConfig) {
        throw new Error("Could not fetch silver program config");
      }

      const silverMint = new PublicKey(silverConfig.mint);

      // Get silver fee controller and role PDAs
      const [silverFeeControllerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("fee_controller")],
        SILVER_PROGRAM_ID,
      );

      const [silverFeeControllerRolePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_role"),
          publicKey.toBuffer(),
          Buffer.from([2]) // Role::FeeController = 2
        ],
        SILVER_PROGRAM_ID,
      );

      console.log("Setting transfer fee for both Gold and Silver tokens:", {
        gold: {
          config: goldConfigAccount.toString(),
          mint: goldMint.toString(),
          feeControllerPda: goldFeeControllerPda.toString(),
          feeControllerRole: goldFeeControllerRolePda.toString(),
        },
        silver: {
          config: silverConfigAccount.toString(),
          mint: silverMint.toString(),
          feeControllerPda: silverFeeControllerPda.toString(),
          feeControllerRole: silverFeeControllerRolePda.toString(),
        },
        admin: publicKey.toString(),
        transfer_fee_basis_points: transferFeeBasisPoints,
        maximum_fee: maximumFee,
      });

      // Create bundled transaction
      const transaction = new Transaction();

      // Add Gold token instruction
      const goldInstruction = await program.methods
        .setTransferFee(transferFeeBasisPoints, new BN(maximumFee))
        .accountsPartial({
          config: goldConfigAccount,
          admin: publicKey,
          mint: goldMint,
          feeControllerPda: goldFeeControllerPda,
          feeControllerRole: goldFeeControllerRolePda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction();

      // Add Silver token instruction
      const silverInstruction = await silverProgram.methods
        .setTransferFee(transferFeeBasisPoints, new BN(maximumFee))
        .accountsPartial({
          config: silverConfigAccount,
          admin: publicKey,
          mint: silverMint,
          feeControllerPda: silverFeeControllerPda,
          feeControllerRole: silverFeeControllerRolePda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction();

      transaction.add(goldInstruction);
      transaction.add(silverInstruction);

      // Send bundled transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;

      const signature = await (walletProvider as any).sendTransaction(
        transaction,
        connection,
      );
      
      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "processed",
      );

      console.log("Bundled transfer fee transaction successful:", signature);
      
      return {
        signature,
        tokens: ["gold", "silver"],
        mints: [goldMint.toString(), silverMint.toString()],
        transfer_fee_basis_points: transferFeeBasisPoints,
        maximum_fee: maximumFee,
      };
    } catch (error) {
      console.error("Error setting transfer fee:", error);
      throw error;
    }
  };

  // // BUNDLED FUNCTION: Add role for both Gold and Silver tokens
  // const addRole = async (user: string, role: number) => {
  //   if (!program || !silverProgram || !publicKey) {
  //     throw new Error("Wallet not connected or programs not initialized");
  //   }

  //   if (!chainId?.includes("solana")) {
  //     throw new Error("Please switch to a Solana network");
  //   }

  //   // Get configs for both programs
  //   const config = await getConfig();
  //   if (!config) {
  //     throw new Error("Could not fetch program config");
  //   }

  //   const userAd = new PublicKey(user);
  //   const transaction = new Transaction();

  //   const roleObj =
  //     role === 2
  //       ? { feeController: {} }
  //       : role === 1
  //         ? { assetProtector: {} }
  //         : role === 0
  //           ? { supplyController: {} }
  //           : { defaultAdmin: {} };

  //   console.log(
  //     role,
  //     { roleObj },
  //     "Adding role for both Gold and Silver tokens",
  //   );

  //   try {
  //     // Gold token role instruction
  //     const goldConfigPda = new PublicKey(config.configPda);

  //     const [goldUserRolePda] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_role"), userAd.toBuffer(), Buffer.from([role])],
  //       GOLD_PROGRAM_ID,
  //     );

  //     const [goldDefaultAdminRolePda] = PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from("user_role"),
  //         publicKey.toBuffer(),
  //         Buffer.from([3]), // Role::DefaultAdmin = 3
  //       ],
  //       GOLD_PROGRAM_ID,
  //     );

  //     const goldInstruction = await program.methods
  //       .addRole(userAd, roleObj)
  //       .accounts({
  //         config: goldConfigPda,
  //         authority: publicKey,
  //         userRole: goldUserRolePda,
  //         defaultAdminRole: goldDefaultAdminRolePda,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .instruction();

  //     // Silver token role instruction
  //     const [silverConfigPda] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("config")],
  //       SILVER_PROGRAM_ID,
  //     );

  //     const [silverUserRolePda] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_role"), userAd.toBuffer(), Buffer.from([role])],
  //       SILVER_PROGRAM_ID,
  //     );

  //     const [silverDefaultAdminRolePda] = PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from("user_role"),
  //         publicKey.toBuffer(),
  //         Buffer.from([3]), // Role::DefaultAdmin = 3
  //       ],
  //       SILVER_PROGRAM_ID,
  //     );

  //     console.log(silverConfigPda?.toBase58(), "silverConfigPda");
  //     console.log(silverUserRolePda?.toBase58(), "silverUserRolePda");
  //     console.log(
  //       silverDefaultAdminRolePda?.toBase58(),
  //       "silverDefaultAdminRolePda",
  //     );

  //     const silverInstruction = await silverProgram.methods
  //       .addRole(userAd, roleObj)
  //       .accounts({
  //         config: silverConfigPda,
  //         authority: publicKey,
  //         userRole: silverUserRolePda,
  //         defaultAdminRole: silverDefaultAdminRolePda,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .instruction();

  //     // Add both instructions
  //     transaction.add(goldInstruction);
  //     transaction.add(silverInstruction);

  //     // ✅ Attach blockhash + fee payer
  //     const { blockhash, lastValidBlockHeight } =
  //       await connection.getLatestBlockhash();
  //     transaction.recentBlockhash = blockhash;
  //     transaction.lastValidBlockHeight = lastValidBlockHeight;
  //     transaction.feePayer = publicKey;

  //     console.log(
  //       "Sending bundled transaction for both Gold and Silver tokens...",
  //     );

  //     // Send the bundled transaction using wallet provider
  //     const signature = await (walletProvider as any).sendTransaction(
  //       transaction,
  //       connection,
  //     );

  //     // Wait for confirmation
  //     await connection.confirmTransaction(
  //       { signature, blockhash, lastValidBlockHeight },
  //       "processed",
  //     );

  //     console.log("✅ Role added successfully for both tokens:", signature);
  //     return signature;
  //   } catch (error) {
  //     console.error("❌ Error adding role:", error);

  //     // Check if user cancelled the transaction
  //     const errorMessage =
  //       error instanceof Error ? error.message : String(error);
  //     if (
  //       errorMessage.includes("User rejected") ||
  //       errorMessage.includes("user rejected") ||
  //       errorMessage.includes("cancelled") ||
  //       errorMessage.includes("User cancelled")
  //     ) {
  //       throw new Error("User rejected the transaction");
  //     }

  //     throw error;
  //   }
  // };

  const addRole = async (user: string, role: number) => {
    if (!goldProgram || !silverProgram || !gatekeeperBothProgram || !publicKey) {
      throw new Error("Wallet not connected or programs not initialized");
    }

    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }

    const userAd = new PublicKey(user);

    // ------------------- PROGRAM IDs (from IDLs) -------------------
    const GOLD_PROGRAM_ID = new PublicKey(
      "4Abztzso97KPMy6fdexqNeVKqUUn2KF5aw6Vb99rV8qg",
    );
    const SILVER_PROGRAM_ID = new PublicKey(
      "3teuujqputEYdvTTLK6eoYygKF2EWDdgFVFGQoce3mc3",
    );
    // Gatekeeper program ID must match the IDL / on-chain program (see transfer_hook_gatekeeper.json)
    const GATEKEEPER_PROGRAM_ID = new PublicKey(
      "HPpSduHvXR6U26ZWPy9DRuASMzGnqis8EPKNxiHHbWJY",
    );

    // ------------------- CONFIGS -------------------
    // GOLD - Use GOLD program ID for gold config
    const [goldConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      GOLD_PROGRAM_ID,
    );
    
    // SILVER - Use SILVER program ID for silver config  
    const [silverConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      SILVER_PROGRAM_ID,
    );

    console.log("Gold Config PDA:", goldConfigPda.toBase58());
    console.log("Silver Config PDA:", silverConfigPda.toBase58());
    console.log("Gold Program ID:", GOLD_PROGRAM_ID.toBase58());
    console.log("Silver Program ID:", SILVER_PROGRAM_ID.toBase58());
    console.log("Actual Gold Program Instance ID:", goldProgram?.programId?.toBase58());
    console.log("Actual Silver Program Instance ID:", silverProgram?.programId?.toBase58());

    const goldConfig = await (goldProgram.account as any).config.fetch(
      goldConfigPda,
    );
    const goldMintKey = new PublicKey(goldConfig.mint);
    console.log("🔑 Gold Mint from config:", goldMintKey.toBase58());

    const silverConfig = await (silverProgram.account as any).config.fetch(
      silverConfigPda,
    );
    const silverMintKey = new PublicKey(silverConfig.mint);
    console.log("🔑 Silver Mint from config:", silverMintKey.toBase58());

    // Known mints that the gatekeeper was initialized with
    const GATEKEEPER_GOLD_MINT = new PublicKey("5CJQxkZK3hAfktFr6Bxz4KN3KYpJALQNibKzeEwJVMGr");
    const GATEKEEPER_SILVER_MINT = new PublicKey("48RTydGnuUE22oLF8riTsPkvUjoTiX81hKMQ4R8BNcd4");
    console.log("🔑 Gatekeeper Gold Mint (hardcoded):", GATEKEEPER_GOLD_MINT.toBase58());
    console.log("🔑 Gatekeeper Silver Mint (hardcoded):", GATEKEEPER_SILVER_MINT.toBase58());

    if (!goldConfig || !silverConfig) {
      throw new Error("Could not fetch program configs");
    }

    // ------------------- ROLE MAPPING -------------------
    const roleObj =
      role === 0
        ? { supplyController: {} }
        : role === 1
          ? { assetProtector: {} }
          : role === 2
            ? { feeController: {} }
            : { defaultAdmin: {} };

    try {
      // Create bundle transaction
      const transaction = new Transaction();

      // =====================================================
      // GOLD PROGRAM
      // =====================================================
      const [goldUserRolePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_role"), userAd.toBuffer(), Buffer.from([role])],
        GOLD_PROGRAM_ID,
      );

      const [goldDefaultAdminRolePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_role"), publicKey.toBuffer(), Buffer.from([3])],
        GOLD_PROGRAM_ID,
      );

      console.log("Creating Gold instruction with config:", goldConfigPda.toBase58());
      const goldIx = await goldProgram.methods
        .addRole(userAd, roleObj)
        .accountsPartial({
          config: goldConfigPda,
          authority: publicKey,
          userRole: goldUserRolePda,
          defaultAdminRole: goldDefaultAdminRolePda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      transaction.add(goldIx);

      // =====================================================
      // SILVER PROGRAM
      // =====================================================
      const [silverUserRolePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_role"), userAd.toBuffer(), Buffer.from([role])],
        SILVER_PROGRAM_ID,
      );

      const [silverDefaultAdminRolePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_role"), publicKey.toBuffer(), Buffer.from([3])],
        SILVER_PROGRAM_ID,
      );

      console.log("Creating Silver instruction with config:", silverConfigPda.toBase58());
      const silverIx = await silverProgram.methods
        .addRole(userAd, roleObj)
        .accountsPartial({
          config: silverConfigPda,
          authority: publicKey,
          userRole: silverUserRolePda,
          defaultAdminRole: silverDefaultAdminRolePda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      transaction.add(silverIx);

      // =====================================================
      // GATEKEEPER PROGRAMS (AssetProtector and DefaultAdmin roles)
      // =====================================================
      if (role === 1 || role === 3) { // AssetProtector or DefaultAdmin role
        try {
          // GATEKEEPER configs for AssetProtector or DefaultAdmin role
          // Use the mints that the gatekeeper was actually initialized with
          const [gatekeeperGoldConfigPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config"), GATEKEEPER_GOLD_MINT.toBuffer()],
            GATEKEEPER_PROGRAM_ID,
          );
          const [gatekeeperSilverConfigPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config"), GATEKEEPER_SILVER_MINT.toBuffer()],
            GATEKEEPER_PROGRAM_ID,
          );
          console.log("🔑 Gatekeeper Gold Config PDA:", gatekeeperGoldConfigPda.toBase58());
          console.log("🔑 Gatekeeper Silver Config PDA:", gatekeeperSilverConfigPda.toBase58());

          // ---- Gatekeeper Role Mapping ----
          // Both programs use same role numbers: AssetProtector=1, DefaultAdmin=3
          const gatekeeperRole = role; // Same role numbers in both programs
          // Map role objects for gatekeeper: AssetProtector={assetProtector:{}}, DefaultAdmin={defaultAdmin:{}}
          const gatekeeperRoleObj = role === 1 ? { assetProtector: {} } : { defaultAdmin: {} };

          // ---- Gatekeeper GOLD ----
          // Gatekeeper uses different PDA pattern: ["user_role", mint, user, role]
          const [gkGoldUserRolePda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_role"),
              GATEKEEPER_GOLD_MINT.toBuffer(),  // Use gatekeeper's gold mint
              userAd.toBuffer(),                // user comes THIRD in gatekeeper  
              Buffer.from([gatekeeperRole]),    // role comes FOURTH in gatekeeper
            ],
            GATEKEEPER_PROGRAM_ID,
          );
          const [gkGoldDefaultAdminPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_role"),
              GATEKEEPER_GOLD_MINT.toBuffer(),  // Use gatekeeper's gold mint
              publicKey.toBuffer(),             // user comes THIRD in gatekeeper
              Buffer.from([3]),                 // DefaultAdmin = 3 in both programs
            ],
            GATEKEEPER_PROGRAM_ID,
          );

          // Check the config admin and default admin role
          let goldDefaultAdminExists = false;
          try {
            const configAccount = await (gatekeeperBothProgram.account as any).config.fetch(gatekeeperGoldConfigPda);
            console.log("🔑 Gold Gatekeeper Config Admin:", configAccount.admin.toString());
            console.log("🔑 Your Wallet:", publicKey.toString());
            console.log("🔑 Are you the config admin?", configAccount.admin.equals(publicKey));
          } catch (error) {
            console.log("⚠️ Gold gatekeeper config not found - needs initialization");
          }

          try {
            console.log("🔍 Checking Gold DefaultAdmin PDA:", gkGoldDefaultAdminPda.toString());
            const roleAccount = await (gatekeeperBothProgram.account as any).userRole.fetch(gkGoldDefaultAdminPda);
            goldDefaultAdminExists = true;
            console.log("✅ Gold DefaultAdmin role EXISTS!");
            console.log("   Role user:", roleAccount.user.toString());
            console.log("   Role type:", roleAccount.role);
          } catch (error) {
            goldDefaultAdminExists = false;
            console.log("❌ Gold DefaultAdmin role does NOT exist for your wallet");
            console.log("   PDA checked:", gkGoldDefaultAdminPda.toString());
          }

          // For DefaultAdmin or AssetProtector roles, proceed with or without existing default admin
          if (role === 3 || role === 1 || goldDefaultAdminExists) {
            // Build accounts object - only include defaultAdminRole if it exists
            const gkGoldAccounts: any = {
              config: gatekeeperGoldConfigPda,
              admin: publicKey,
              mint: GATEKEEPER_GOLD_MINT,       // Use gatekeeper's gold mint
              userRole: gkGoldUserRolePda,
              systemProgram: SystemProgram.programId,
            };
            
            // Only add defaultAdminRole if it exists (optional account)
            if (goldDefaultAdminExists) {
              gkGoldAccounts.defaultAdminRole = gkGoldDefaultAdminPda;
            }

            const gkGoldIx = await gatekeeperBothProgram.methods
              .addRole(userAd, gatekeeperRoleObj) // Use gatekeeper role object
              .accountsPartial(gkGoldAccounts)
              .instruction();

            transaction.add(gkGoldIx);
          } else {
            console.log("⚠️ Skipping Gold gatekeeper role - default admin not initialized");
          }

          // ---- Gatekeeper SILVER ----
          const [gkSilverUserRolePda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_role"),
              GATEKEEPER_SILVER_MINT.toBuffer(), // Use gatekeeper's silver mint
              userAd.toBuffer(),                 // user comes THIRD in gatekeeper
              Buffer.from([gatekeeperRole]),     // role comes FOURTH in gatekeeper
            ],
            GATEKEEPER_PROGRAM_ID,
          );
          const [gkSilverDefaultAdminPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_role"),
              GATEKEEPER_SILVER_MINT.toBuffer(), // Use gatekeeper's silver mint
              publicKey.toBuffer(),              // user comes THIRD in gatekeeper  
              Buffer.from([3]),                  // DefaultAdmin = 3 in both programs
            ],
            GATEKEEPER_PROGRAM_ID,
          );

          // Check the config admin and default admin role for Silver
          let silverDefaultAdminExists = false;
          try {
            const configAccount = await (gatekeeperBothProgram.account as any).config.fetch(gatekeeperSilverConfigPda);
            console.log("🔑 Silver Gatekeeper Config Admin:", configAccount.admin.toString());
            console.log("🔑 Are you the Silver config admin?", configAccount.admin.equals(publicKey));
          } catch (error) {
            console.log("⚠️ Silver gatekeeper config not found - needs initialization");
          }

          try {
            console.log("🔍 Checking Silver DefaultAdmin PDA:", gkSilverDefaultAdminPda.toString());
            const roleAccount = await (gatekeeperBothProgram.account as any).userRole.fetch(gkSilverDefaultAdminPda);
            silverDefaultAdminExists = true;
            console.log("✅ Silver DefaultAdmin role EXISTS!");
            console.log("   Role user:", roleAccount.user.toString());
            console.log("   Role type:", roleAccount.role);
          } catch (error) {
            silverDefaultAdminExists = false;
            console.log("❌ Silver DefaultAdmin role does NOT exist for your wallet");
            console.log("   PDA checked:", gkSilverDefaultAdminPda.toString());
          }

          // For DefaultAdmin or AssetProtector roles, proceed with or without existing default admin
          if (role === 3 || role === 1 || silverDefaultAdminExists) {
            // Build accounts object - only include defaultAdminRole if it exists
            const gkSilverAccounts: any = {
              config: gatekeeperSilverConfigPda,
              admin: publicKey,
              mint: GATEKEEPER_SILVER_MINT,      // Use gatekeeper's silver mint
              userRole: gkSilverUserRolePda,
              systemProgram: SystemProgram.programId,
            };
            
            // Only add defaultAdminRole if it exists (optional account)
            if (silverDefaultAdminExists) {
              gkSilverAccounts.defaultAdminRole = gkSilverDefaultAdminPda;
            }

            const gkSilverIx = await gatekeeperBothProgram.methods
              .addRole(userAd, gatekeeperRoleObj) // Use gatekeeper role object
              .accountsPartial(gkSilverAccounts)
              .instruction();

            transaction.add(gkSilverIx);
          } else {
            console.log("⚠️ Skipping Silver gatekeeper role - default admin not initialized");
          }

        } catch (gatekeeperError) {
          console.log("⚠️ Gatekeeper setup failed, continuing with Gold/Silver only:", gatekeeperError);
        }
      }

      // =====================================================
      // SEND BUNDLED TRANSACTION
      // =====================================================
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;

      console.log(
        `Sending bundled transaction with ${transaction.instructions.length} instructions...`
      );

      // Send the bundled transaction using wallet provider
      const signature = await (walletProvider as any).sendTransaction(
        transaction,
        connection,
      );

      // Wait for confirmation
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "processed",
      );

      const roleNames = {
        0: "SupplyController",
        1: "AssetProtector",
        2: "FeeController",
        3: "DefaultAdmin"
      };
      
      const roleName = roleNames[role as keyof typeof roleNames] || "Unknown";
      
      if (role === 1) {
        console.log(`✅ ${roleName} role added successfully for both Gold/Silver tokens and Gatekeeper programs:`, signature);
      } else {
        console.log(`✅ ${roleName} role added successfully for both Gold and Silver tokens:`, signature);
      }
      
      return signature;
    } catch (error) {
      console.error("❌ Error adding role:", error);

      // Check if user cancelled the transaction
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("user rejected") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("User cancelled")
      ) {
        throw new Error("User rejected the transaction");
      }

      throw error;
    }
  };

  // BUNDLED FUNCTION: Remove role for Gold, Silver, and optionally Gatekeeper
  const removeRole = async (user: string, role: number) => {
    if (!program || !silverProgram || !gatekeeperBothProgram || !publicKey) {
      throw new Error("Wallet not connected or programs not initialized");
    }

    if (!chainId?.includes("solana")) {
      throw new Error("Please switch to a Solana network");
    }

    // Get configs for both programs
    const config = await getConfig();
    if (!config) {
      throw new Error("Could not fetch program config");
    }

    const userAd = new PublicKey(user);

    const roleObj =
      role === 2
        ? { feeController: {} }
        : role === 1
          ? { assetProtector: {} }
          : role === 0
            ? { supplyController: {} }
            : { defaultAdmin: {} };

    console.log(
      role,
      { roleObj },
      "Removing role for Gold, Silver & Gatekeeper",
    );

    try {
      const transaction = new Transaction();

      // ------------------- PROGRAM IDs -------------------
    // Program IDs from the IDLs
    const GOLD_PROGRAM_ID = new PublicKey(
      "4Abztzso97KPMy6fdexqNeVKqUUn2KF5aw6Vb99rV8qg",
    );
    const SILVER_PROGRAM_ID = new PublicKey(
      "3teuujqputEYdvTTLK6eoYygKF2EWDdgFVFGQoce3mc3",
    );
    const GATEKEEPER_PROGRAM_ID = new PublicKey(
      "HPpSduHvXR6U26ZWPy9DRuASMzGnqis8EPKNxiHHbWJY",
    );

      // Known mints that the gatekeeper was initialized with
      const GATEKEEPER_GOLD_MINT = new PublicKey("5CJQxkZK3hAfktFr6Bxz4KN3KYpJALQNibKzeEwJVMGr");
      const GATEKEEPER_SILVER_MINT = new PublicKey("48RTydGnuUE22oLF8riTsPkvUjoTiX81hKMQ4R8BNcd4");

      // ------------------- CONFIGS -------------------
      const [goldConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        GOLD_PROGRAM_ID,
      );
      const [silverConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        SILVER_PROGRAM_ID,
      );

      // ------------------- GOLD PROGRAM -------------------
      const [goldUserRolePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_role"), userAd.toBuffer(), Buffer.from([role])],
        GOLD_PROGRAM_ID,
      );

      const [goldDefaultAdminRolePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_role"), publicKey.toBuffer(), Buffer.from([3])],
        GOLD_PROGRAM_ID,
      );

      // Check if Gold user role account exists
      let goldRoleExists = false;
      try {
        await connection.getAccountInfo(goldUserRolePda);
        goldRoleExists = true;
      } catch (error) {
        console.log("Gold user role doesn't exist, skipping Gold program");
      }

      if (goldRoleExists) {
        const goldInstruction = await goldProgram!.methods
          .removeRole(userAd, roleObj)
          .accounts({
            config: goldConfigPda,
            authority: publicKey,
            userRole: goldUserRolePda,
            defaultAdminRole: goldDefaultAdminRolePda,
          })
          .instruction();

        transaction.add(goldInstruction);
      }

      // ------------------- SILVER PROGRAM -------------------
      const [silverUserRolePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_role"), userAd.toBuffer(), Buffer.from([role])],
        SILVER_PROGRAM_ID,
      );

      const [silverDefaultAdminRolePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_role"), publicKey.toBuffer(), Buffer.from([3])],
        SILVER_PROGRAM_ID,
      );

      // Check if Silver user role account exists
      let silverRoleExists = false;
      try {
        await connection.getAccountInfo(silverUserRolePda);
        silverRoleExists = true;
      } catch (error) {
        console.log("Silver user role doesn't exist, skipping Silver program");
      }

      if (silverRoleExists) {
        const silverInstruction = await silverProgram.methods
          .removeRole(userAd, roleObj)
          .accounts({
            config: silverConfigPda,
            authority: publicKey,
            userRole: silverUserRolePda,
            defaultAdminRole: silverDefaultAdminRolePda,
          })
          .instruction();

        transaction.add(silverInstruction);
      }

      // =====================================================
      // GATEKEEPER PROGRAMS - Match addRole structure exactly
      // =====================================================
      if (role === 1 || role === 3) { // AssetProtector or DefaultAdmin role
        try {
          // GATEKEEPER configs for AssetProtector or DefaultAdmin role
          // Use the mints that the gatekeeper was actually initialized with
          const [gatekeeperGoldConfigPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config"), GATEKEEPER_GOLD_MINT.toBuffer()],
            GATEKEEPER_PROGRAM_ID,
          );
          const [gatekeeperSilverConfigPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config"), GATEKEEPER_SILVER_MINT.toBuffer()],
            GATEKEEPER_PROGRAM_ID,
          );

          // ---- Gatekeeper Role Mapping ----
          // Both programs use same role numbers: AssetProtector=1, DefaultAdmin=3
          const gatekeeperRole = role; // Same role numbers in both programs
          // Map role objects for gatekeeper: AssetProtector={assetProtector:{}}, DefaultAdmin={defaultAdmin:{}}
          const gatekeeperRoleObj = role === 1 ? { assetProtector: {} } : { defaultAdmin: {} };

          // ---- Gatekeeper GOLD ----
          // Gatekeeper uses different PDA pattern: ["user_role", mint, user, role]
          const [gkGoldUserRolePda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_role"),
              GATEKEEPER_GOLD_MINT.toBuffer(),  // Use gatekeeper's gold mint
              userAd.toBuffer(),                // user comes THIRD in gatekeeper  
              Buffer.from([gatekeeperRole]),    // role comes FOURTH in gatekeeper
            ],
            GATEKEEPER_PROGRAM_ID,
          );
          const [gkGoldDefaultAdminPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_role"),
              GATEKEEPER_GOLD_MINT.toBuffer(),  // Use gatekeeper's gold mint
              publicKey.toBuffer(),             // user comes THIRD in gatekeeper
              Buffer.from([3]),                 // DefaultAdmin = 3 in both programs
            ],
            GATEKEEPER_PROGRAM_ID,
          );

          // Check if gatekeeper role exists for Gold
          let goldGatekeeperRoleExists = false;
          try {
            const info = await connection.getAccountInfo(gkGoldUserRolePda);
            goldGatekeeperRoleExists = info !== null;
          } catch (error) {
            console.log("Gold gatekeeper role doesn't exist, skipping");
          }

          // Check if default admin role exists for Gold gatekeeper
          let goldDefaultAdminExists = false;
          try {
            const info = await connection.getAccountInfo(gkGoldDefaultAdminPda);
            goldDefaultAdminExists = info !== null;
          } catch (error) {
            console.log("Gold gatekeeper default admin role not initialized yet");
          }

          if (goldGatekeeperRoleExists) {
            // Build accounts object - only include defaultAdminRole if it exists
            const gkGoldAccounts: any = {
              config: gatekeeperGoldConfigPda,
              admin: publicKey,
              mint: GATEKEEPER_GOLD_MINT,
              userRole: gkGoldUserRolePda,
            };
            
            if (goldDefaultAdminExists) {
              gkGoldAccounts.defaultAdminRole = gkGoldDefaultAdminPda;
            }

            const gkGoldIx = await gatekeeperBothProgram.methods
              .removeRole(userAd, gatekeeperRoleObj) // Use gatekeeper role object
              .accountsPartial(gkGoldAccounts)
              .instruction();

            transaction.add(gkGoldIx);
          } else {
            console.log("⚠️ Skipping Gold gatekeeper role - role doesn't exist");
          }

          // ---- Gatekeeper SILVER ----
          const [gkSilverUserRolePda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_role"),
              GATEKEEPER_SILVER_MINT.toBuffer(), // Use gatekeeper's silver mint
              userAd.toBuffer(),                 // user comes THIRD in gatekeeper
              Buffer.from([gatekeeperRole]),     // role comes FOURTH in gatekeeper
            ],
            GATEKEEPER_PROGRAM_ID,
          );
          const [gkSilverDefaultAdminPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_role"),
              GATEKEEPER_SILVER_MINT.toBuffer(), // Use gatekeeper's silver mint
              publicKey.toBuffer(),              // user comes THIRD in gatekeeper
              Buffer.from([3]),                 // DefaultAdmin = 3 in both programs
            ],
            GATEKEEPER_PROGRAM_ID,
          );

          // Check if gatekeeper role exists for Silver
          let silverGatekeeperRoleExists = false;
          try {
            const info = await connection.getAccountInfo(gkSilverUserRolePda);
            silverGatekeeperRoleExists = info !== null;
          } catch (error) {
            console.log("Silver gatekeeper role doesn't exist, skipping");
          }

          // Check if default admin role exists for Silver gatekeeper
          let silverDefaultAdminExists = false;
          try {
            const info = await connection.getAccountInfo(gkSilverDefaultAdminPda);
            silverDefaultAdminExists = info !== null;
          } catch (error) {
            console.log("Silver gatekeeper default admin role not initialized yet");
          }

          if (silverGatekeeperRoleExists) {
            // Build accounts object - only include defaultAdminRole if it exists
            const gkSilverAccounts: any = {
              config: gatekeeperSilverConfigPda,
              admin: publicKey,
              mint: GATEKEEPER_SILVER_MINT,
              userRole: gkSilverUserRolePda,
            };
            
            if (silverDefaultAdminExists) {
              gkSilverAccounts.defaultAdminRole = gkSilverDefaultAdminPda;
            }

            const gkSilverIx = await gatekeeperBothProgram.methods
              .removeRole(userAd, gatekeeperRoleObj) // Use gatekeeper role object
              .accountsPartial(gkSilverAccounts)
              .instruction();

            transaction.add(gkSilverIx);
          } else {
            console.log("⚠️ Skipping Silver gatekeeper role - role doesn't exist");
          }

        } catch (gatekeeperError) {
          console.log("⚠️ Gatekeeper setup failed, continuing with Gold/Silver only:", gatekeeperError);
        }
      }

      // ------------------- SEND BUNDLED TX -------------------
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      console.log("Sending bundled transaction for removing roles...");

      const signature = await (walletProvider as any).sendTransaction(
        transaction,
        connection,
      );

      await connection.confirmTransaction(signature, "processed");

      const roleNames = {
        0: "SupplyController",
        1: "AssetProtector", 
        2: "FeeController",
        3: "DefaultAdmin"
      };
      
      const roleName = roleNames[role as keyof typeof roleNames] || "Unknown";
      
      if (role === 1 || role === 3) {
        console.log(`✅ ${roleName} role removed successfully for both Gold/Silver tokens and Gatekeeper programs:`, signature);
      } else {
        console.log(`✅ ${roleName} role removed successfully for both Gold and Silver tokens:`, signature);
      }
      return signature;
    } catch (error) {
      console.error("❌ Error removing role:", error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("user rejected") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("User cancelled")
      ) {
        throw new Error("User rejected the transaction");
      }

      throw error;
    }
  };

  const updatePurchaseRequestStatus = async (
    purchaseRequestId: string,
    txHash: string,
    navigate: any,
  ) => {
    try {
      console.log("🔄 Updating purchase request status to completed...");

      const response = await apiRequest.post(
        `/api/purchase-requests/${purchaseRequestId}/mint-tokens`,
        {
          transactionHash: txHash,
          tokensMinted: true,
          status: "completed",
        },
      );

      if (response.success) {
        console.log("✅ Purchase request status updated successfully");
        toast({
          title: "Process Complete",
          description: "Tokens minted and purchase request completed!",
          duration: 5000,
        });
        navigate("/purchase-requests");
      } else {
        throw new Error(
          response.message || "Failed to update purchase request",
        );
      }
    } catch (error) {
      console.error("❌ Error updating purchase request:", error);
      toast({
        title: "Database Update Failed",
        description: "Tokens were minted but failed to update purchase status",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  // Update redemption status in database
  const updateRedemptionStatus = async (
    requestId: string,
    status: string,
    navigate: any,
  ) => {
    try {
      console.log(`🔄 Updating redemption status to ${status}...`);

      const response = await apiRequest.put(
        `/api/transactions/redemption-requests/${requestId}`,
        {
          status: status,
        },
      );

      if (response.success) {
        console.log("✅ Redemption status updated successfully");

        navigate("/redemption-requests");
        toast({
          title: "Process Complete",
          description: "Redemption processing started successfully!",
          duration: 5000,
        });
      } else {
        throw new Error(
          response.message || "Failed to update redemption status",
        );
      }
    } catch (error) {
      console.error("❌ Error updating redemption status:", error);

      toast({
        title: "Database Update Failed",
        description:
          "Processing started but failed to update redemption status",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  return {
    program,
    silverProgram, // Added silver program for additional functions
    mintTokens,
    initializeToken,
    getConfig,
    requestRedemption,
    // NEW FUNCTIONS ADDED
    cancelRedemption,
    fulfillRedemption,
    setRedemptionProcessing,
    getRedemptionRequest,
    setTransferFee,
    updatePurchaseRequestStatus,
    updateRedemptionStatus,

    addRole, // Now supports both Gold and Silver tokens in a bundled transaction
    removeRole, // Now supports both Gold and Silver tokens in a bundled transaction
    // EXISTING PROPERTIES
    connected: isConnected && chainId.includes("solana"),
    publicKey,
    address, // Raw address string from Reown Kit
    chainId,
  };
}

// Alternative approach if you need more direct control over the wallet provider
export function useMemeTokenProgramAlternative() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("solana");
  const chainId = "solana_devnet"; // Fixed chain ID

  // You can access the public key directly from the address
  const publicKey = useMemo(() => {
    return address ? new PublicKey(address) : null;
  }, [address]);

  // Example of using the wallet provider directly
  const signAndSendTransaction = async (transaction: any) => {
    if (!walletProvider || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      // Sign the transaction
      const signedTransaction = await (walletProvider as any).signTransaction(
        transaction,
      );

      // Send it (you'll need a connection instance)
      const connection = new Connection("https://api.devnet.solana.com");
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
      );

      return signature;
    } catch (error) {
      console.error("Error signing/sending transaction:", error);
      throw error;
    }
  };

  return {
    publicKey,
    address,
    isConnected: isConnected && chainId.includes("solana"),
    walletProvider,
    signAndSendTransaction,
  };
}
