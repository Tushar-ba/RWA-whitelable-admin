import mongoose from 'mongoose';
import { PurchaseHistory } from '../schemas/purchase-history.schema.js';
import { GiftingTransaction } from '../schemas/gifting-transaction.schema.js';
import { Redemption } from '../schemas/redemption.schema.js';
import { AppUser } from '../schemas/user.schema.js';

const samplePurchaseHistory = [
  {
    userId: 'user_001',
    metal: 'gold',
    tokenAmount: '100',
    usdAmount: '2500',
    feeAmount: '25',
    date: '2025-08-11',
    time: '10:30 AM',
    status: 'completed',
    networkType: 'public',
    paymentMethod: 'credit_card',
    transactionHash: '0x123abc456def789',
    walletAddress: '0xabcdef123456789'
  },
  {
    userId: 'user_002',
    metal: 'silver',
    tokenAmount: '500',
    usdAmount: '1200',
    feeAmount: '12',
    date: '2025-08-10',
    time: '2:15 PM',
    status: 'completed',
    networkType: 'private',
    paymentMethod: 'bank_transfer',
    transactionHash: '0x789def123abc456',
    walletAddress: '0xfedcba987654321'
  }
];

const sampleGiftingTransactions = [
  {
    userId: 'user_001',
    recipientWallet: '0x111222333444555',
    token: 'gold',
    quantity: '50',
    message: 'Happy Birthday!',
    network: 'ethereum',
    status: 'completed',
    transactionHash: '0xgift123456789',
    networkFee: '5',
    tokenValueUSD: '1250',
    totalCostUSD: '1255',
    gramsAmount: '50',
    currentTokenPrice: '25'
  },
  {
    userId: 'user_002',
    recipientWallet: '0x666777888999000',
    token: 'silver',
    quantity: '200',
    message: 'Congratulations!',
    network: 'polygon',
    status: 'pending',
    networkFee: '2',
    tokenValueUSD: '480',
    totalCostUSD: '482',
    gramsAmount: '200',
    currentTokenPrice: '2.4'
  }
];

const sampleRedemptions = [
  {
    id: 'redemption_001',
    userId: 'user_001',
    token: 'gold',
    quantity: '25',
    gramsAmount: '25',
    tokenValueUSD: '625',
    network: 'ethereum',
    deliveryAddress: 'Main Office',
    streetAddress: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    status: 'shipped',
    transactionHash: '0xredemption123',
    requestId: 'REQ_001',
    deliveryFee: '25',
    totalCostUSD: '650',
    currentTokenPrice: '25'
  },
  {
    id: 'redemption_002',
    userId: 'user_002',
    token: 'silver',
    quantity: '100',
    gramsAmount: '100',
    tokenValueUSD: '240',
    network: 'polygon',
    deliveryAddress: 'Branch Office',
    streetAddress: '456 Oak Ave',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    country: 'USA',
    status: 'pending',
    deliveryFee: '15',
    totalCostUSD: '255',
    currentTokenPrice: '2.4'
  }
];

const sampleUsers = [
  {
    user_id: 'user_001',
    email: 'john.doe@example.com',
    password_hash: 'hashed_password_1',
    first_name: 'John',
    last_name: 'Doe',
    country: 'USA',
    state: 'NY',
    account_status: 'ACTIVE',
    email_verified: true,
    terms_accepted: true,
    two_factor_enabled: false
  },
  {
    user_id: 'user_002',
    email: 'jane.smith@example.com',
    password_hash: 'hashed_password_2',
    first_name: 'Jane',
    last_name: 'Smith',
    country: 'USA',
    state: 'CA',
    account_status: 'ACTIVE',
    email_verified: true,
    terms_accepted: true,
    two_factor_enabled: false
  }
];

export async function seedTransactions() {
  try {
    // Clear existing data
    await PurchaseHistory.deleteMany({});
    await GiftingTransaction.deleteMany({});
    await Redemption.deleteMany({});
    
    // Check if users exist, if not create them
    const existingUsers = await AppUser.find({ user_id: { $in: ['user_001', 'user_002'] } });
    if (existingUsers.length < 2) {
      await AppUser.insertMany(sampleUsers);
      console.log('✅ Sample users created');
    }
    
    // Insert sample data
    await PurchaseHistory.insertMany(samplePurchaseHistory);
    await GiftingTransaction.insertMany(sampleGiftingTransactions);
    await Redemption.insertMany(sampleRedemptions);
    
    console.log('✅ Transaction sample data seeded successfully');
    console.log(`- Created ${samplePurchaseHistory.length} purchase history records`);
    console.log(`- Created ${sampleGiftingTransactions.length} gifting transaction records`);
    console.log(`- Created ${sampleRedemptions.length} redemption records`);
    
  } catch (error) {
    console.error('❌ Error seeding transaction data:', error);
  }
}

// Run seeding if this file is executed directly
if (process.argv[1].includes('seed-transactions.js')) {
  seedTransactions().then(() => process.exit(0));
}