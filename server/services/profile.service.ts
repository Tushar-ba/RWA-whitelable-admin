import { Admin } from '../schemas/admin.schema';
import { Role } from '../schemas/role.schema';

export class ProfileService {
  async getAdminProfile(adminId: string) {
    try {
      const admin = await Admin.findById(adminId).select('-password_hash');
      
      if (!admin) {
        return null;
      }

      // Get role information for each role
      const rolesData = [];
      if (admin.roles && admin.roles.length > 0) {
        for (const roleName of admin.roles) {
          const role = await Role.findOne({ name: roleName });
          if (role) {
            rolesData.push({
              id: role._id,
              name: role.name,
              description: role.description,
              permissions: role.permissions,
              isActive: role.isActive
            });
          } else {
            rolesData.push({
              name: roleName,
              permissions: admin.permissions || [],
              isActive: true
            });
          }
        }
      }

      return {
        id: admin._id,
        user_id: admin.user_id,
        email: admin.email,
        name: admin.full_name,
        network: admin.network || 'Ethereum',
        walletAddress: admin.wallet_address,
        isActive: admin.account_status === 'verified',
        lastLogin: admin.last_login,
        createdAt: admin.created_at,
        roles: rolesData,
        permissions: admin.permissions || []
      };
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      throw error;
    }
  }

  async updateAdminProfile(adminId: string, updateData: any) {
    try {
      // Only allow updating specific fields for security
      const allowedFields = ['name', 'network'];
      const filteredData: any = {};
      
      // Map frontend field names to backend schema field names
      if (updateData.name !== undefined) {
        filteredData.full_name = updateData.name;
      }
      if (updateData.network !== undefined) {
        filteredData.network = updateData.network;
      }

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated timestamp
      filteredData.updated_at = new Date();

      const updatedAdmin = await Admin.findByIdAndUpdate(
        adminId, 
        filteredData, 
        { new: true, runValidators: true }
      ).select('-password_hash');

      if (!updatedAdmin) {
        return null;
      }

      // Get updated profile with role information
      return await this.getAdminProfile(adminId);
    } catch (error) {
      console.error('Error updating admin profile:', error);
      throw error;
    }
  }


}