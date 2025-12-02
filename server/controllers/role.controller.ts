import { Request, Response } from 'express';
import { RoleService, RoleQueryParams } from '../services/role.service';
import { insertRoleSchema } from '@shared/schema';

export class RoleController {
  private roleService: RoleService;

  constructor() {
    this.roleService = new RoleService();
  }

  getAllRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if query parameters are provided for filtering/pagination
      const hasQueryParams = Object.keys(req.query).length > 0;
      
      if (hasQueryParams) {
        const queryParams: RoleQueryParams = {
          page: req.query.page ? parseInt(req.query.page as string) : 1,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
          search: req.query.search as string,
          isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
          sortBy: req.query.sortBy as string,
          sortOrder: req.query.sortOrder as 'asc' | 'desc'
        };
        
        const result = await this.roleService.getRolesWithFilters(queryParams);
        res.json(result);
      } else {
        // Return all roles for backward compatibility
        const roles = await this.roleService.getAllRoles();
        res.json(roles);
      }
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  };

  getRoleById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const role = await this.roleService.getRoleById(id);
      
      if (!role) {
        res.status(404).json({ message: "Role not found" });
        return;
      }
      
      res.json(role);
    } catch (error) {
      console.error('Get role error:', error);
      res.status(500).json({ message: "Failed to fetch role" });
    }
  };

  createRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await this.roleService.createRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error('Create role error:', error);
      res.status(400).json({ message: "Invalid role data" });
    }
  };

  updateRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Get the current role first to track changes
      const currentRole = await this.roleService.getRoleById(id);
      if (!currentRole) {
        res.status(404).json({ message: "Role not found" });
        return;
      }

      const role = await this.roleService.updateRole(id, updates);
      
      if (!role) {
        res.status(404).json({ message: "Role not found" });
        return;
      }

      // If permissions were updated, update all admins with this role
      if (updates.permissions && 
          JSON.stringify(updates.permissions.sort()) !== JSON.stringify(currentRole.permissions.sort())) {
        console.log(`🔄 Role permissions changed for ${role.name}, updating admin permissions...`);
        
        // Import AuthService here to avoid circular dependencies
        const { AuthService } = await import('../services/auth.service');
        const authService = new AuthService();
        
        // Update permissions for all admins with this role (async, don't wait)
        authService.updateAdminPermissionsByRole(role.name).catch(error => {
          console.error('Error updating admin permissions after role update:', error);
        });
      }
      
      res.json(role);
    } catch (error) {
      console.error('Update role error:', error);
      res.status(400).json({ message: "Failed to update role" });
    }
  };

  deleteRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const role = await this.roleService.deleteRole(id);
      
      if (!role) {
        res.status(404).json({ message: "Role not found" });
        return;
      }
      
      res.json({ message: "Role deleted successfully", role });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(400).json({ message: "Failed to delete role" });
    }
  };
}