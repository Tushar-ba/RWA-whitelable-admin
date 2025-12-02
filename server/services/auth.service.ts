import { Admin, IAdmin } from '../schemas/admin.schema';
import { Role, IRole } from '../schemas/role.schema';
import bcrypt from 'bcrypt';

export class AuthService {
  async getAdminByEmail(email: string): Promise<IAdmin | null> {
    try {
      return await Admin.findOne({ email, account_status: 'verified', isDeleted: { $ne: true } });
    } catch (error) {
      throw new Error(`Error finding admin: ${error}`);
    }
  }

  async getAdminById(id: string): Promise<IAdmin | null> {
    try {
      return await Admin.findOne({ _id: id, isDeleted: { $ne: true } });
    } catch (error) {
      throw new Error(`Error finding admin: ${error}`);
    }
  }

  async createAdmin(adminData: Partial<IAdmin>): Promise<IAdmin> {
    try {
      const admin = new Admin(adminData);
      return await admin.save();
    } catch (error) {
      throw new Error(`Error creating admin: ${error}`);
    }
  }

  async updateAdmin(id: string, updateData: Partial<IAdmin>): Promise<IAdmin | null> {
    try {
      return await Admin.findByIdAndUpdate(
        id, 
        { ...updateData, updated_at: new Date() }, 
        { new: true }
      );
    } catch (error) {
      throw new Error(`Error updating admin: ${error}`);
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await Admin.findByIdAndUpdate(id, { last_login: new Date() });
    } catch (error) {
      throw new Error(`Error updating last login: ${error}`);
    }
  }

  async createSuperAdmin(): Promise<IAdmin | null> {
    try {
      // Check if super admin already exists
      const existingSuperAdmin = await Admin.findOne({ 
        email: 'admin@vaultedassets.com',
        isDeleted: { $ne: true }
      });

      if (existingSuperAdmin) {
        console.log('✅ Super admin already exists, skipping creation');
        return existingSuperAdmin;
      }

      // Get default admin role permissions
      const defaultRole = await Role.findOne({ name: 'DEFAULT_ADMIN_ROLE' });
      const permissions = defaultRole ? defaultRole.permissions : [
        "Dashboard", "User Management", "Assets Storage", "Purchase Requests", 
        "Redemption Requests", "Wallet Management", "Transactions", 
        "Notifications", "Role Management", "Admin Management", "Platform Fee Management"
      ];

      // Hash password
      const hashedPassword = await bcrypt.hash('admin123456', 12);

      const superAdminData = {
        email: 'admin@vaultedassets.com',
        password_hash: hashedPassword,
        full_name: 'Super Admin',
        roles: ['DEFAULT_ADMIN_ROLE'],
        isSuperAdmin: true,
        permissions: permissions,
        account_status: 'verified',
        email_verified: true,
        two_factor_enabled: false,
        isInvited: false,
        isAccepted: true,
        phone_number: '',
        wallet_address: '0x742d35cc6A6C4532CF6e05Cdcb1C4Dcf8FdeBE1A'
      };

      const superAdmin = new Admin(superAdminData);
      const savedAdmin = await superAdmin.save();
      console.log('✅ Super admin created successfully');
      console.log(`📧 Email: ${savedAdmin.email}`);
      console.log(`🔑 Password: admin123456`);
      console.log(`👤 User ID: ${savedAdmin.user_id}`);
      return savedAdmin;
    } catch (error) {
      console.error('❌ Error creating super admin:', error);
      throw error;
    }
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  async getAllRoles(): Promise<IRole[]> {
    try {
      return await Role.find({ isActive: true }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching roles: ${error}`);
    }
  }

  async getRoleById(id: string): Promise<IRole | null> {
    try {
      return await Role.findById(id);
    } catch (error) {
      throw new Error(`Error finding role: ${error}`);
    }
  }

  async calculatePermissionsFromRoles(roleNames: string[]): Promise<string[]> {
    try {
      if (!roleNames || roleNames.length === 0) {
        return [];
      }

      const roles = await Role.find({ 
        name: { $in: roleNames },
        isActive: true 
      });

      const permissions = new Set<string>();
      roles.forEach(role => {
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach(permission => permissions.add(permission));
        }
      });

      return Array.from(permissions);
    } catch (error) {
      console.error('Error calculating permissions from roles:', error);
      return [];
    }
  }

  async markAdminAsVerified(adminId: string): Promise<void> {
    try {
      await Admin.findByIdAndUpdate(adminId, {
        email_verified: true,
        isAccepted: true,
        otp: undefined,
        otp_expires_at: undefined,
        account_status: 'verified'
      });
      console.log(`✅ Admin ${adminId} marked as verified and OTP cleared`);
    } catch (error) {
      console.error('Error marking admin as verified:', error);
      throw new Error('Failed to verify admin');
    }
  }

  async updateAdminPermissionsByRole(roleName: string): Promise<void> {
    try {
      console.log(`🔄 Updating permissions for all admins with role: ${roleName}`);
      
      // Find all admins who have this role
      const adminsWithRole = await Admin.find({ 
        roles: roleName, 
        isDeleted: { $ne: true } 
      });

      console.log(`📊 Found ${adminsWithRole.length} admins with role ${roleName}`);

      // Update each admin's permissions
      for (const admin of adminsWithRole) {
        const updatedPermissions = await this.calculatePermissionsFromRoles(admin.roles);
        
        await Admin.findByIdAndUpdate(admin._id, {
          permissions: updatedPermissions,
          updated_at: new Date()
        });

        console.log(`✅ Updated permissions for admin ${admin.email}: [${updatedPermissions.join(', ')}]`);
      }

      console.log(`✅ Successfully updated permissions for all admins with role ${roleName}`);
    } catch (error) {
      console.error('Error updating admin permissions by role:', error);
      throw new Error('Failed to update admin permissions by role');
    }
  }

  async updateAdminPermissionsByAdminId(adminId: string): Promise<void> {
    try {
      console.log(`🔄 Updating permissions for admin: ${adminId}`);
      
      const admin = await Admin.findById(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      const updatedPermissions = await this.calculatePermissionsFromRoles(admin.roles);
      
      await Admin.findByIdAndUpdate(admin._id, {
        permissions: updatedPermissions,
        updated_at: new Date()
      });

      console.log(`✅ Updated permissions for admin ${admin.email}: [${updatedPermissions.join(', ')}]`);
    } catch (error) {
      console.error('Error updating admin permissions:', error);
      throw new Error('Failed to update admin permissions');
    }
  }

  async generateAndSaveOTP(adminId: string): Promise<string> {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

      await Admin.findByIdAndUpdate(adminId, {
        otp: otp,
        otp_expires_at: expiresAt,
        updated_at: new Date()
      });

      console.log(`🔑 Generated OTP for admin ${adminId}`);
      return otp;
    } catch (error) {
      console.error('Error generating OTP:', error);
      throw new Error('Failed to generate OTP');
    }
  }

  async updatePassword(adminId: string, newPassword: string): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await Admin.findByIdAndUpdate(adminId, {
        password_hash: hashedPassword,
        otp: undefined,
        otp_expires_at: undefined,
        updated_at: new Date()
      });

      console.log(`✅ Password updated for admin ${adminId}`);
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error('Failed to update password');
    }
  }

}