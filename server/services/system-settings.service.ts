import { SystemSettings, ISystemSettings } from '../schemas/system-settings.schema';
import migratePlatformFee from '../scripts/migrate-platform-fee';

export class SystemSettingsService {
  async getAllSettings(): Promise<ISystemSettings[]> {
    try {
      return await SystemSettings.find().sort({ updatedAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching system settings: ${error}`);
    }
  }

  async getSettingByKey(key: string): Promise<ISystemSettings | null> {
    try {
      return await SystemSettings.findOne({ key: key.toLowerCase() });
    } catch (error) {
      throw new Error(`Error finding system setting: ${error}`);
    }
  }

  async updateSetting(key: string, value: any, updatedBy: string): Promise<ISystemSettings> {
    try {
      const setting = await SystemSettings.findOneAndUpdate(
        { key: key.toLowerCase() },
        { 
          value, 
          updatedBy, 
          updatedAt: new Date() 
        },
        { 
          new: true, 
          upsert: true 
        }
      );
      return setting!;
    } catch (error) {
      throw new Error(`Error updating system setting: ${error}`);
    }
  }

  async initializeDefaultSettings(adminId: string): Promise<void> {
    try {
      // Run migration first to handle existing data
      await migratePlatformFee();
      
      // Check if settings already exist
      const existingSettings = await SystemSettings.find();
      if (existingSettings.length > 0) return;

      // Create default settings
      const defaultSettings = [
        {
          key: 'platform_fee',
          value: { percentage: 1.5 },
          updatedBy: adminId
        },
        {
          key: 'redemption_fee',
          value: {
            percentage: 2.0
          },
          updatedBy: adminId
        },
        {
          key: 'token_transfer_fee',
          value: {
            percentage: 0.5
          },
          updatedBy: adminId
        }
      ];

      await SystemSettings.insertMany(defaultSettings);
    } catch (error) {
      throw new Error(`Error initializing default settings: ${error}`);
    }
  }
}