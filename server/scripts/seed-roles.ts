import "dotenv/config";
import mongoose from "mongoose";
import { Role } from "../schemas/role.schema";

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined in the environment variables");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: 'vaulted_assets'
  });
   
  console.log(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const rolesToEnsure = [
    {
      name: "SUPPLY_CONTROLLER_ROLE",
      description: "Supply controller – manages minting, burning and supply changes",
      permissions: [
        "Dashboard",
        "Assets Storage",
        "Purchase Requests",
        "Redemption Requests",
        "Transactions",
      ],
      // For Solana we only need the name; for EVM this would normally be the bytes32 role id.
      blockchainRoleId: "SUPPLY_CONTROLLER_ROLE",
    },
    {
      name: "ASSET_PROTECTION_ROLE",
      description: "Asset protection – can freeze / unfreeze and wipe addresses",
      permissions: [
        "Dashboard",
        "Assets Storage",
        "Redemption Requests",
        "Transactions",
        "Notifications",
      ],
      blockchainRoleId: "ASSET_PROTECTION_ROLE",
    },
    {
      name: "FEE_CONTROLLER_ROLE",
      description: "Fee controller – manages platform and transfer fee configuration",
      permissions: [
        "Dashboard",
        "Platform Fee Management",
        "Transactions",
      ],
      blockchainRoleId: "FEE_CONTROLLER_ROLE",
    },
    {
      name: "DEFAULT_ADMIN_ROLE",
      description: "Default admin – full administrative access",
      permissions: [
        "Dashboard",
        "User Management",
        "Assets Storage",
        "Purchase Requests",
        "Redemption Requests",
        "Wallet Management",
        "Transactions",
        "Notifications",
        "Role Management",
        "Admin Management",
        "Platform Fee Management",
      ],
      blockchainRoleId: "DEFAULT_ADMIN_ROLE",
    },
  ];

  for (const role of rolesToEnsure) {
    const existing = await Role.findOne({ name: role.name });
    if (existing) {
      console.log(`ℹ️ Role ${role.name} already exists, skipping`);
      continue;
    }

    await Role.create(role);
    console.log(`✅ Created role ${role.name}`);
  }

  await mongoose.disconnect();
  console.log("✅ Done seeding roles");
}

main().catch((err) => {
  console.error("❌ Failed to seed roles:", err);
  process.exit(1);
});


