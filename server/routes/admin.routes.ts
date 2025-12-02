import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { Admin } from '../schemas/admin.schema';
import { Role } from '../schemas/role.schema';
import { emailService } from '../services/email.service';
import { AuthService } from '../services/auth.service';

import bcrypt from 'bcrypt';

const router = Router();

// Check for specific admin issues (debug endpoint)
router.get('/debug/check-email/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const admin = await Admin.findOne({ email }).select('-password_hash');
    
    if (!admin) {
      res.json({ found: false, message: 'Admin not found' });
      return;
    }

    res.json({
      found: true,
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        name: admin.full_name,
        isDeleted: admin.isDeleted,
        roles: admin.roles,
        permissions: admin.permissions,
        created: admin.created_at
      }
    });
  } catch (error) {
    console.error('Error checking admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Clean up problematic admin (debug endpoint)
router.delete('/debug/cleanup/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      res.json({ message: 'Admin not found - nothing to clean up' });
      return;
    }

    if (admin.isDeleted) {
      // Permanently delete soft-deleted admin
      await Admin.deleteOne({ email });
      console.log(`🧹 Permanently deleted soft-deleted admin: ${email}`);
      res.json({ message: 'Soft-deleted admin permanently removed' });
    } else {
      res.json({ message: 'Admin exists and is active - not deleted' });
    }
  } catch (error) {
    console.error('Error cleaning up admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all admins (excluding soft deleted)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const admins = await Admin.find({ isDeleted: { $ne: true } })
      .select('-password_hash')
      .sort({ created_at: -1 });

    // Transform the data to match frontend expectations
    const transformedAdmins = admins.map(admin => ({
      id: admin._id.toString(),
      name: admin.full_name,
      email: admin.email,
      walletAddress: admin.wallet_address || '',
      network: admin.network || '',
      roles: admin.roles || ['DEFAULT_ADMIN_ROLE'],
      isSuperAdmin: admin.isSuperAdmin || false,
      createdAt: admin.created_at,
      lastLogin: admin.last_login || admin.created_at,
      status: admin.email_verified ? 'Active' : 'Pending'
    }));

    res.json(transformedAdmins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get admin by ID (excluding soft deleted)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findOne({ _id: id, isDeleted: { $ne: true } })
      .select('-password_hash');

    if (!admin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    const transformedAdmin = {
      id: admin._id.toString(),
      name: admin.full_name,
      email: admin.email,
      walletAddress: admin.wallet_address || '',
      network: admin.network || '',
      roles: admin.roles || ['DEFAULT_ADMIN_ROLE'],
      isSuperAdmin: admin.isSuperAdmin || false,
      createdAt: admin.created_at,
      lastLogin: admin.last_login || admin.created_at,
      status: admin.email_verified ? 'Active' : 'Pending'
    };

    res.json(transformedAdmin);
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new admin (invite)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, walletAddress, role, network } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      res.status(400).json({ message: 'Admin with this email already exists' });
      return;
    }

    // Check if role exists
    if (role && role !== 'DEFAULT_ADMIN_ROLE') {
      const roleExists = await Role.findOne({ name: role });
      if (!roleExists) {
        res.status(400).json({ message: 'Invalid role specified' });
        return;
      }
    }

    // Generate temporary password and OTP
    const temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Calculate permissions based on the assigned role
    const authService = new AuthService();
    const roleArray = [role || 'DEFAULT_ADMIN_ROLE'];
    const permissions = await authService.calculatePermissionsFromRoles(roleArray);

    // Create new admin with temporary password and OTP
    const newAdmin = new Admin({
      full_name: name,
      email: email,
      wallet_address: walletAddress || '',
      network: network || '',
      roles: roleArray,
      permissions: permissions,
      email_verified: false,
      password_hash: hashedPassword,
      otp: otp,
      otp_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiration
      isInvited: true,
      isAccepted: false
    });

    await newAdmin.save();

    console.log(`✅ Created new admin ${email} with roles [${roleArray.join(', ')}] and permissions [${permissions.join(', ')}]`);

    // Get inviter name for email
    const authReq = req as AuthenticatedRequest;
    const inviterAdmin = await Admin.findById(authReq.admin?.adminId);
    const inviterName = inviterAdmin?.full_name || 'Admin Team';

    // Send invitation email with OTP and temporary password
    try {
      await emailService.sendAdminInvitationEmail(
        email,
        name,
        otp,
        inviterName,
        temporaryPassword
      );
      console.log(`✅ Invitation email sent to ${email} with OTP: ${otp}`);
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      // Continue with admin creation even if email fails
      console.log(`📧 [FALLBACK] Admin invited: ${email}, OTP: ${otp}, Password: ${temporaryPassword}`);
    }

    // Note: Blockchain role granting is handled entirely on the frontend
    // using wagmi hooks to interact with smart contracts directly

    const transformedAdmin = {
      id: newAdmin._id.toString(),
      name: newAdmin.full_name,
      email: newAdmin.email,
      walletAddress: newAdmin.wallet_address || '',
      roles: newAdmin.roles || [role || 'DEFAULT_ADMIN_ROLE'],
      isSuperAdmin: newAdmin.isSuperAdmin || false,
      createdAt: newAdmin.created_at,
      lastLogin: newAdmin.created_at,
      status: 'Pending'
    };

    res.status(201).json({
      message: 'Admin invited successfully',
      admin: transformedAdmin
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update admin
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, addRole, status, roles } = req.body;

    // Get current admin data
    const currentAdmin = await Admin.findById(id);
    if (!currentAdmin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    const updateData: any = {};
    
    if (name !== undefined) updateData.full_name = name;
    if (email !== undefined) updateData.email = email;
    if (status !== undefined) updateData.email_verified = status === 'Active';
    
    // Handle direct roles array update (for role revocation)
    if (roles !== undefined && Array.isArray(roles)) {
      console.log("🔄 Direct roles array update:", {
        adminId: id,
        currentRoles: currentAdmin.roles,
        newRoles: roles
      });
      updateData.roles = roles;
    }
    // Handle adding new role (for role addition)
    else if (addRole && addRole !== '') {
      const currentRoles = currentAdmin.roles || [];
      if (!currentRoles.includes(addRole)) {
        updateData.roles = [...currentRoles, addRole];
      }
    }
    
    updateData.updated_at = new Date();

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password_hash');

    // If roles were updated, recalculate and update permissions
    if (updateData.roles !== undefined) {
      console.log(`🔄 Admin roles changed for ${updatedAdmin?.email}, updating permissions...`);
      
      try {
        // Import AuthService to recalculate permissions
        const { AuthService } = await import('../services/auth.service.js');
        const authService = new AuthService();
        
        const newPermissions = await authService.calculatePermissionsFromRoles(updateData.roles);
        
        // Update the admin with new permissions
        await Admin.findByIdAndUpdate(id, {
          permissions: newPermissions,
          updated_at: new Date()
        });

        console.log(`✅ Updated permissions for admin ${updatedAdmin?.email}: [${newPermissions.join(', ')}]`);
        
        // Update the response with new permissions
        if (updatedAdmin) {
          (updatedAdmin as any).permissions = newPermissions;
        }
      } catch (permissionError) {
        console.error('Error updating admin permissions after role change:', permissionError);
        // Continue with the response even if permission update fails
      }
    }

    if (!updatedAdmin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    const transformedAdmin = {
      id: updatedAdmin._id.toString(),
      name: updatedAdmin.full_name,
      email: updatedAdmin.email,
      walletAddress: updatedAdmin.wallet_address || '',
      roles: updatedAdmin.roles || ['DEFAULT_ADMIN_ROLE'],
      isSuperAdmin: updatedAdmin.isSuperAdmin || false,
      createdAt: updatedAdmin.created_at,
      lastLogin: updatedAdmin.last_login || updatedAdmin.created_at,
      status: updatedAdmin.email_verified ? 'Active' : 'Pending'
    };

    res.json({
      message: 'Admin updated successfully',
      admin: transformedAdmin
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Soft delete admin
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting the current user
    if (req.admin?.adminId === id) {
      res.status(400).json({ message: 'Cannot delete your own account' });
      return;
    }

    // Find admin first to check if it exists and is not already deleted
    const admin = await Admin.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!admin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    // Prevent deleting super admin
    if (admin.isSuperAdmin) {
      res.status(400).json({ message: 'Cannot delete super admin account' });
      return;
    }

    // Perform soft delete by setting isDeleted to true
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { 
        isDeleted: true,
        updated_at: new Date()
      },
      { new: true }
    );

    if (!updatedAdmin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;