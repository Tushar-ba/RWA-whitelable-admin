import { Admin } from '../schemas/admin.schema';
import { Role } from '../schemas/role.schema';
import { AppUser } from '../schemas/user.schema';
import { PurchaseRequest } from '../schemas/purchase-request.schema';
import { SystemSettings } from '../schemas/system-settings.schema';
import { Stock } from '../schemas/stock.schema';

export class DatabaseSeeder {
  static async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...');

      // Check if data already exists
      const existingAdmin = await Admin.findOne();
      if (existingAdmin) {
        console.log('📦 Database already seeded, skipping...');
        return;
      }

      // Create default roles
      console.log('👥 Creating default roles...');
      const superAdminRole = await Role.create({
        name: "SUPER_ADMIN_ROLE",
        description: "Full system access with all administrative privileges",
        permissions: [
          "Dashboard", "User Management", "Assets Storage", "Purchase Requests",
          "Redemption Requests", "Wallet Management", "Transactions", "Notifications",
          "Role Management", "Admin Management", "Platform Fee Management"
        ],
        isActive: true
      });

      const adminRole = await Role.create({
        name: "ADMIN_ROLE",
        description: "Standard administrative access for day-to-day operations",
        permissions: [
          "Dashboard", "User Management", "Assets Storage", "Purchase Requests",
          "Redemption Requests", "Wallet Management", "Notifications"
        ],
        isActive: true
      });

      await Role.create({
        name: "SUPPLY_CONTROLLER_ROLE",
        description: "Specialized role for inventory and transaction management",
        permissions: [
          "Dashboard", "Assets Storage", "Purchase Requests", "Redemption Requests",
          "Transactions"
        ],
        isActive: true
      });

      await Role.create({
        name: "SUPPORT_ROLE",
        description: "Customer support access with limited administrative rights",
        permissions: [
          "Dashboard", "User Management", "Purchase Requests", "Redemption Requests", "Notifications"
        ],
        isActive: true
      });

      // Create default admin
      console.log('🔐 Creating default admin...');
      const defaultAdmin = await Admin.create({
        email: "admin@vaultedassets.com",
        password: "admin123456", // In real app, this would be hashed
        name: "Super Admin",
        roleId: superAdminRole._id,
        isActive: true
      });

      // Initialize stock
      console.log('📊 Creating default stock...');
      await Stock.create([
        {
          asset: 'gold',
          totalQuantity: '15240.5',
          reservedQuantity: '2150.0',
          availableQuantity: '13090.5',
          updatedBy: defaultAdmin._id.toString()
        },
        {
          asset: 'silver',
          totalQuantity: '48750.2',
          reservedQuantity: '5200.0',
          availableQuantity: '43550.2',
          updatedBy: defaultAdmin._id.toString()
        }
      ]);

      // Initialize system settings
      console.log('⚙️ Creating system settings...');
      await SystemSettings.create([
        {
          key: 'maintenance_fee',
          value: { amount: 2.00, percentage: 1.5 },
          updatedBy: defaultAdmin._id.toString()
        },
        {
          key: 'redemption_fee',
          value: {
            fixed: 5.00,
            insurance: 3.00,
            taxRates: { india: 8.0, uae: 0.0, usa: 3.0 }
          },
          updatedBy: defaultAdmin._id.toString()
        }
      ]);

      // Create sample users
      console.log('👤 Creating sample users...');
      const sampleUsers = [
        { email: "john.doe@example.com", kycStatus: "verified", accountStatus: "active" },
        { email: "sarah.wilson@example.com", kycStatus: "verified", accountStatus: "active" },
        { email: "mike.chen@example.com", kycStatus: "pending", accountStatus: "active" },
        { email: "lisa.brown@example.com", kycStatus: "verified", accountStatus: "active" }
      ];

      await AppUser.create(sampleUsers.map(user => ({
        ...user,
        joinDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      })));

      // Create sample purchase requests
      console.log('📋 Creating sample purchase requests...');
      const sampleRequests = [
        {
          requestId: "REQ-2025-001",
          userEmail: "john.doe@example.com",
          asset: "gold",
          usdcAmount: "5000.00",
          platformFee: "75.00",
          kycStatus: "verified",
          status: "approved",
          autoApproved: true,
          vaultAllocated: true,
          vaultNumber: "V-GOLD-001",
          vaultLocation: "Singapore Vault A",
          allocationNotes: "High security vault allocation for premium customer",
          tokensMinted: true,
          notes: "Customer requested premium vault storage",
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        },
        {
          requestId: "REQ-2025-002",
          userEmail: "sarah.wilson@example.com",
          asset: "silver",
          usdcAmount: "2500.00",
          platformFee: "37.50",
          kycStatus: "verified",
          status: "approved",
          autoApproved: false,
          vaultAllocated: false,
          tokensMinted: false,
          notes: "Standard silver purchase request",
          createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        },
        {
          requestId: "REQ-2025-003",
          userEmail: "mike.chen@example.com",
          asset: "gold",
          usdcAmount: "7500.00",
          platformFee: "112.50",
          kycStatus: "pending",
          status: "pending",
          autoApproved: false,
          vaultAllocated: false,
          tokensMinted: false,
          notes: "Awaiting KYC verification",
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        },
        {
          requestId: "REQ-2025-004",
          userEmail: "lisa.brown@example.com",
          asset: "silver",
          usdcAmount: "1000.00",
          platformFee: "15.00",
          kycStatus: "verified",
          status: "rejected",
          autoApproved: false,
          vaultAllocated: false,
          tokensMinted: false,
          notes: "Customer requested refund",
          rejectionReason: "Insufficient documentation provided",
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        }
      ];

      await PurchaseRequest.create(sampleRequests);

      console.log('✅ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
}