import { Connection, PublicKey } from "@solana/web3.js";

// Define the roles enum to match the programs
const ROLES = [
  { name: "SupplyController", value: 0 },
  { name: "AssetProtector", value: 1 },
  { name: "FeeController", value: 2 },
  { name: "DefaultAdmin", value: 3 },
];

// Program IDs (from IDLs)
const GOLD_PROGRAM_ID = new PublicKey("4Abztzso97KPMy6fdexqNeVKqUUn2KF5aw6Vb99rV8qg");
const SILVER_PROGRAM_ID = new PublicKey("3teuujqputEYdvTTLK6eoYygKF2EWDdgFVFGQoce3mc3");
const GATEKEEPER_PROGRAM_ID = new PublicKey("HPpSduHvXR6U26ZWPy9DRuASMzGnqis8EPKNxiHHbWJY");

// Known mints (from your on-chain config/scripts)
const GOLD_MINT = new PublicKey("5CJQxkZK3hAfktFr6Bxz4KN3KYpJALQNibKzeEwJVMGr");
const SILVER_MINT = new PublicKey("48RTydGnuUE22oLF8riTsPkvUjoTiX81hKMQ4R8BNcd4");

async function checkUserRoles(userAddress: string, rpcUrl: string = "https://api.devnet.solana.com") {
  console.log("=== Checking User Roles in Gold/Silver Tokens and Gatekeeper ===\n");

  const user = new PublicKey(userAddress);
  console.log("Checking roles for user:", user.toBase58());
  console.log("RPC URL:", rpcUrl);
  console.log("");

  const connection = new Connection(rpcUrl, "confirmed");

  // --------------------------------------------------
  // GoldToken roles
  // --------------------------------------------------
  console.log("=== GoldToken Program Roles ===");
  const goldTokenRoles: string[] = [];

  for (const role of ROLES) {
    const [userRolePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_role"), user.toBuffer(), Buffer.from([role.value])],
      GOLD_PROGRAM_ID,
    );

    console.log(`Checking ${role.name} role PDA: ${userRolePda.toBase58()}`);
    const info = await connection.getAccountInfo(userRolePda);
    if (info) {
      console.log(`✅ ${role.name}: GRANTED`);
      goldTokenRoles.push(role.name);
    } else {
      console.log(`❌ ${role.name}: NOT GRANTED`);
    }
  }

  console.log("");

  // --------------------------------------------------
  // SilverToken roles
  // --------------------------------------------------
  console.log("=== SilverToken Program Roles ===");
  const silverTokenRoles: string[] = [];

  for (const role of ROLES) {
    const [userRolePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_role"), user.toBuffer(), Buffer.from([role.value])],
      SILVER_PROGRAM_ID,
    );

    console.log(`Checking ${role.name} role PDA: ${userRolePda.toBase58()}`);
    const info = await connection.getAccountInfo(userRolePda);
    if (info) {
      console.log(`✅ ${role.name}: GRANTED`);
      silverTokenRoles.push(role.name);
    } else {
      console.log(`❌ ${role.name}: NOT GRANTED`);
    }
  }

  console.log("");

  // --------------------------------------------------
  // Gatekeeper roles for Gold mint
  // --------------------------------------------------
  console.log("=== Gatekeeper Program Roles (Gold) ===");
  const gatekeeperGoldRoles: string[] = [];

  for (const role of ROLES) {
    const [userRolePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_role"),
        GOLD_MINT.toBuffer(),
        user.toBuffer(),
        Buffer.from([role.value]),
      ],
      GATEKEEPER_PROGRAM_ID,
    );

    console.log(`Checking ${role.name} role PDA: ${userRolePda.toBase58()}`);
    const info = await connection.getAccountInfo(userRolePda);
    if (info) {
      console.log(`✅ ${role.name}: GRANTED`);
      gatekeeperGoldRoles.push(role.name);
    } else {
      console.log(`❌ ${role.name}: NOT GRANTED`);
    }
  }

  console.log("");

  // --------------------------------------------------
  // Gatekeeper roles for Silver mint
  // --------------------------------------------------
  console.log("=== Gatekeeper Program Roles (Silver) ===");
  const gatekeeperSilverRoles: string[] = [];

  for (const role of ROLES) {
    const [userRolePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_role"),
        SILVER_MINT.toBuffer(),
        user.toBuffer(),
        Buffer.from([role.value]),
      ],
      GATEKEEPER_PROGRAM_ID,
    );

    console.log(`Checking ${role.name} role PDA: ${userRolePda.toBase58()}`);
    const info = await connection.getAccountInfo(userRolePda);
    if (info) {
      console.log(`✅ ${role.name}: GRANTED`);
      gatekeeperSilverRoles.push(role.name);
    } else {
      console.log(`❌ ${role.name}: NOT GRANTED`);
    }
  }

  console.log("");
  console.log("=== SUMMARY ===");
  console.log(`User: ${user.toBase58()}`);
  console.log(`GoldToken roles: ${goldTokenRoles.length ? goldTokenRoles.join(", ") : "None"}`);
  console.log(`SilverToken roles: ${silverTokenRoles.length ? silverTokenRoles.join(", ") : "None"}`);
  console.log(`Gatekeeper (Gold) roles: ${gatekeeperGoldRoles.length ? gatekeeperGoldRoles.join(", ") : "None"}`);
  console.log(`Gatekeeper (Silver) roles: ${gatekeeperSilverRoles.length ? gatekeeperSilverRoles.join(", ") : "None"}`);

  if (!goldTokenRoles.length && !silverTokenRoles.length && !gatekeeperGoldRoles.length && !gatekeeperSilverRoles.length) {
    console.log("❌ No roles found for this user in any program.");
  } else {
    console.log("✅ Role check completed successfully!");
  }
}

// Get wallet address from command line arguments
const walletAddress = process.argv[2];
const rpcUrl = process.argv[3];

if (!walletAddress) {
  console.error("Usage: npx tsx scripts/checkRoles.ts <WALLET_ADDRESS> [RPC_URL]");
  process.exit(1);
}

checkUserRoles(walletAddress, rpcUrl)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error checking user roles:", error);
    process.exit(1);
  });

