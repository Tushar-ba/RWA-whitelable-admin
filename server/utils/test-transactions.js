// Test script to create sample transactions
import mongoose from 'mongoose';
import { PurchaseRequest } from '../schemas/purchase-request.schema.ts';
import { RedemptionRequest } from '../schemas/redemption-request.schema.ts';
import { GiftingTransaction } from '../schemas/gifting-transaction.schema.ts';

async function createTestTransactions() {
  try {
    // Connect to MongoDB with the same database name as Express app
    await mongoose.connect('mongodb+srv://vpayal:ARRJ38ec1igL4hUn@rwa.yefh5sn.mongodb.net/vaulted_assets');
    console.log('Connected to MongoDB (vaulted_assets database)');

    const userEmail = 'testuser@yopmail.com';

    // Create sample purchase request
    const purchaseRequest = new PurchaseRequest({
      requestId: 'PUR-' + Date.now(),
      userEmail: userEmail,
      asset: 'gold',
      usdcAmount: '1000.00',
      platformFee: '25.00',
      kycStatus: 'verified',
      status: 'approved',
      vaultAllocated: true,
      vaultNumber: 'VAULT-001',
      tokensMinted: true,
      notes: 'Sample purchase request for testing'
    });
    await purchaseRequest.save();
    console.log('Created purchase request:', purchaseRequest.requestId);

    // Create sample redemption request
    const redemptionRequest = new RedemptionRequest({
      requestId: 'RED-' + Date.now(),
      userEmail: userEmail,
      token: 'gold',
      quantity: '50.5',
      redemptionMethod: 'physical_delivery',
      status: 'pending',
      notes: 'Sample redemption request for testing'
    });
    await redemptionRequest.save();
    console.log('Created redemption request:', redemptionRequest.requestId);

    // Create sample gifting transaction
    const giftingTransaction = new GiftingTransaction({
      giftId: 'GIFT-' + Date.now(),
      senderWallet: '0x1234567890abcdef1234567890abcdef12345678',
      receiverWallet: '0xabcdef1234567890abcdef1234567890abcdef12',
      token: 'silver',
      quantity: '25.0',
      message: 'Happy birthday! Here\'s some silver.',
      status: 'completed',
      transactionHash: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    });
    await giftingTransaction.save();
    console.log('Created gifting transaction:', giftingTransaction.giftId);

    console.log('Sample transactions created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test transactions:', error);
    process.exit(1);
  }
}

createTestTransactions();