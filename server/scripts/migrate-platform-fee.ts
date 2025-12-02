import { SystemSettings } from '../schemas/system-settings.schema';
import mongoose from 'mongoose';

/**
 * Migration script to rename maintenance_fee to platform_fee
 * and convert redemption_fee to percentage only
 */
async function migratePlatformFee() {
  try {
    console.log('🔄 Starting fee migration...');
    
    // Migrate maintenance_fee to platform_fee
    const maintenanceFee = await SystemSettings.findOne({ key: 'maintenance_fee' });
    
    if (maintenanceFee) {
      console.log('📋 Found existing maintenance_fee setting:', maintenanceFee.value);
      
      // Create new platform_fee setting with only percentage
      const platformFeeValue = {
        percentage: maintenanceFee.value?.percentage || 1.5
      };
      
      // Check if platform_fee already exists
      const existingPlatformFee = await SystemSettings.findOne({ key: 'platform_fee' });
      
      if (existingPlatformFee) {
        console.log('✅ Platform fee setting already exists, updating...');
        await SystemSettings.findOneAndUpdate(
          { key: 'platform_fee' },
          { 
            value: platformFeeValue,
            updatedAt: new Date()
          }
        );
      } else {
        console.log('➕ Creating new platform_fee setting...');
        await SystemSettings.create({
          key: 'platform_fee',
          value: platformFeeValue,
          updatedBy: maintenanceFee.updatedBy || 'system'
        });
      }
      
      // Remove old maintenance_fee setting
      console.log('🗑️ Removing old maintenance_fee setting...');
      await SystemSettings.findOneAndDelete({ key: 'maintenance_fee' });
      
      console.log('✅ Platform fee migration completed');
    } else {
      console.log('ℹ️ No maintenance_fee setting found, creating default platform_fee...');
      
      // Create default platform_fee if no maintenance_fee exists
      const existingPlatformFee = await SystemSettings.findOne({ key: 'platform_fee' });
      
      if (!existingPlatformFee) {
        await SystemSettings.create({
          key: 'platform_fee',
          value: { percentage: 1.5 },
          updatedBy: 'system'
        });
        console.log('✅ Default platform_fee setting created');
      } else {
        console.log('ℹ️ Platform fee setting already exists');
      }
    }

    // Migrate redemption_fee to percentage only
    const redemptionFee = await SystemSettings.findOne({ key: 'redemption_fee' });
    
    if (redemptionFee) {
      console.log('📋 Found existing redemption_fee setting:', redemptionFee.value);
      
      // Convert to percentage-only structure (use existing percentage or calculate from fixed+insurance)
      const redemptionFeeValue = {
        percentage: redemptionFee.value?.percentage || 2.0 // Default to 2% if no percentage exists
      };
      
      // Update the redemption_fee setting
      console.log('🔄 Converting redemption_fee to percentage only...');
      await SystemSettings.findOneAndUpdate(
        { key: 'redemption_fee' },
        { 
          value: redemptionFeeValue,
          updatedAt: new Date()
        }
      );
      
      console.log('✅ Redemption fee migration completed');
    } else {
      console.log('ℹ️ No redemption_fee setting found, creating default...');
      
      await SystemSettings.create({
        key: 'redemption_fee',
        value: { percentage: 2.0 },
        updatedBy: 'system'
      });
      console.log('✅ Default redemption_fee setting created');
    }

    // Ensure token_transfer_fee exists
    const tokenTransferFee = await SystemSettings.findOne({ key: 'token_transfer_fee' });
    
    if (!tokenTransferFee) {
      console.log('ℹ️ No token_transfer_fee setting found, creating default...');
      
      await SystemSettings.create({
        key: 'token_transfer_fee',
        value: { percentage: 0.5 },
        updatedBy: 'system'
      });
      console.log('✅ Default token_transfer_fee setting created');
    } else {
      console.log('ℹ️ Token transfer fee setting already exists');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export default migratePlatformFee;