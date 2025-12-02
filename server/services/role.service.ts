import { Role, IRole } from '../schemas/role.schema';
import { type InsertRole } from '@shared/schema';

export interface RoleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedRolesResponse {
  roles: IRole[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRoles: number;
    limit: number;
  };
}

export class RoleService {
  async getAllRoles(): Promise<IRole[]> {
    try {
      return await Role.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching roles: ${error}`);
    }
  }

  async getRolesWithFilters(params: RoleQueryParams): Promise<PaginatedRolesResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      // Build query object
      const query: any = {};

      // Add search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Add active status filter
      if (typeof isActive === 'boolean') {
        query.isActive = isActive;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute queries
      const [roles, totalRoles] = await Promise.all([
        Role.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        Role.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalRoles / limit);

      return {
        roles,
        pagination: {
          currentPage: page,
          totalPages,
          totalRoles,
          limit
        }
      };
    } catch (error) {
      throw new Error(`Error fetching roles with filters: ${error}`);
    }
  }

  async getRoleById(id: string): Promise<IRole | null> {
    try {
      return await Role.findById(id);
    } catch (error) {
      throw new Error(`Error finding role: ${error}`);
    }
  }

  async createRole(roleData: InsertRole): Promise<IRole> {
    try {
      const role = new Role(roleData);
      return await role.save();
    } catch (error) {
      throw new Error(`Error creating role: ${error}`);
    }
  }

  async updateRole(id: string, updateData: Partial<IRole>): Promise<IRole | null> {
    try {
      return await Role.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
    } catch (error) {
      throw new Error(`Error updating role: ${error}`);
    }
  }

  async deleteRole(id: string): Promise<IRole | null> {
    try {
      return await Role.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`Error deleting role: ${error}`);
    }
  }

  async getRolesCount(): Promise<number> {
    try {
      return await Role.countDocuments();
    } catch (error) {
      throw new Error(`Error counting roles: ${error}`);
    }
  }
}