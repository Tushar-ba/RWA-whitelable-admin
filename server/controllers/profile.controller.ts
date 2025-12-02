import { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service';

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = req.params.adminId;
      
      if (!adminId) {
        res.status(400).json({ message: "Admin ID is required" });
        return;
      }

      const profile = await this.profileService.getAdminProfile(adminId);
      
      if (!profile) {
        res.status(404).json({ message: "Admin profile not found" });
        return;
      }

      res.json({ profile });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = req.params.adminId;
      const updateData = req.body;
      
      if (!adminId) {
        res.status(400).json({ message: "Admin ID is required" });
        return;
      }

      const updatedProfile = await this.profileService.updateAdminProfile(adminId, updateData);
      
      if (!updatedProfile) {
        res.status(404).json({ message: "Admin profile not found" });
        return;
      }

      res.json({ 
        message: "Profile updated successfully",
        profile: updatedProfile 
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  };


}