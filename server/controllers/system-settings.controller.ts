import { Request, Response } from 'express';
import { SystemSettingsService } from '../services/system-settings.service';

export class SystemSettingsController {
  private systemSettingsService: SystemSettingsService;

  constructor() {
    this.systemSettingsService = new SystemSettingsService();
  }

  getAllSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await this.systemSettingsService.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error('Get system settings error:', error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  };

  getSettingByKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const setting = await this.systemSettingsService.getSettingByKey(key);
      
      if (!setting) {
        res.status(404).json({ message: "Setting not found" });
        return;
      }
      
      res.json(setting);
    } catch (error) {
      console.error('Get system setting error:', error);
      res.status(500).json({ message: "Failed to fetch system setting" });
    }
  };

  updateSetting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const { value, updatedBy } = req.body;
      
      const setting = await this.systemSettingsService.updateSetting(key, value, updatedBy);
      res.json(setting);
    } catch (error) {
      console.error('Update system setting error:', error);
      res.status(400).json({ message: "Failed to update system setting" });
    }
  };
}