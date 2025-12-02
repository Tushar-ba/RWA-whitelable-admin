// Check MongoDB collections and data
import mongoose from 'mongoose';
import { PurchaseRequest } from '../schemas/purchase-request.schema.ts';
import { RedemptionRequest } from '../schemas/redemption-request.schema.ts';
import { GiftingTransaction } from '../schemas/gifting-transaction.schema.ts';

async function checkCollections() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://vpayal:ARRJ38ec1igL4hUn@rwa.yefh5sn.mongodb.net/');
    console.log('Connected to MongoDB');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));

    // Check data in each collection
    console.log('\n--- Purchase Requests ---');
    const purchases = await PurchaseRequest.find().limit(5);
    console.log('Total purchase requests:', await PurchaseRequest.countDocuments());
    purchases.forEach(p => console.log('Purchase:', p.requestId, p.userEmail, p.status));

    console.log('\n--- Redemption Requests ---');
    const redemptions = await RedemptionRequest.find().limit(5);
    console.log('Total redemption requests:', await RedemptionRequest.countDocuments());
    redemptions.forEach(r => console.log('Redemption:', r.requestId, r.userEmail, r.status));

    console.log('\n--- Gifting Transactions ---');
    const gifts = await GiftingTransaction.find().limit(5);
    console.log('Total gifting transactions:', await GiftingTransaction.countDocuments());
    gifts.forEach(g => console.log('Gift:', g.giftId, g.senderWallet, g.status));

    console.log('\n--- User Data for testuser@yopmail.com ---');
    const userEmail = 'testuser@yopmail.com';
    const userPurchases = await PurchaseRequest.find({ userEmail });
    const userRedemptions = await RedemptionRequest.find({ userEmail });
    
    console.log(`Purchases for ${userEmail}:`, userPurchases.length);
    userPurchases.forEach(p => console.log('  -', p.requestId, p.asset, p.usdcAmount));
    
    console.log(`Redemptions for ${userEmail}:`, userRedemptions.length);
    userRedemptions.forEach(r => console.log('  -', r.requestId, r.token, r.quantity));

    process.exit(0);
  } catch (error) {
    console.error('Error checking collections:', error);
    process.exit(1);
  }
}

checkCollections();