// Check database connection and collections from Express context
import mongoose from 'mongoose';
import { PurchaseRequest } from '../schemas/purchase-request.schema.ts';
import { RedemptionRequest } from '../schemas/redemption-request.schema.ts';

async function checkDbFromExpressContext() {
  try {
    console.log('Current mongoose connection state:', mongoose.connection.readyState);
    console.log('Connected to database:', mongoose.connection.db?.databaseName);
    console.log('Connection host:', mongoose.connection.host);
    
    // Check current collections in the connected database
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Collections in current database:', collections.map(c => c.name));
      
      // Check data in purchase requests
      console.log('\n--- Purchase Requests from Express Context ---');
      const purchases = await PurchaseRequest.find({}).limit(3);
      console.log('Purchase requests found:', purchases.length);
      purchases.forEach(p => {
        console.log('Purchase:', p.requestId, 'Email:', p.userEmail);
      });

      // Check data in redemption requests  
      console.log('\n--- Redemption Requests from Express Context ---');
      const redemptions = await RedemptionRequest.find({}).limit(3);
      console.log('Redemption requests found:', redemptions.length);
      redemptions.forEach(r => {
        console.log('Redemption:', r.requestId, 'Email:', r.userEmail);
      });
      
      // Test specific query for our user
      console.log('\n--- Specific Query for testuser@yopmail.com ---');
      const userPurchases = await PurchaseRequest.find({ userEmail: 'testuser@yopmail.com' });
      const userRedemptions = await RedemptionRequest.find({ userEmail: 'testuser@yopmail.com' });
      console.log('User purchases found:', userPurchases.length);
      console.log('User redemptions found:', userRedemptions.length);
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDbFromExpressContext();