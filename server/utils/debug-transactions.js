// Debug script to test TransactionService directly
import mongoose from 'mongoose';
import { TransactionService } from '../services/transaction.service.ts';

async function debugTransactions() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://vpayal:ARRJ38ec1igL4hUn@rwa.yefh5sn.mongodb.net/');
    console.log('Connected to MongoDB');

    const transactionService = new TransactionService();
    const userEmail = 'testuser@yopmail.com';

    console.log(`\n--- Testing getUserTransactions for ${userEmail} ---`);
    const transactions = await transactionService.getUserTransactions(userEmail);
    console.log('Transactions returned:', JSON.stringify(transactions, null, 2));

    console.log(`\n--- Testing getTransactionStats for ${userEmail} ---`);
    const stats = await transactionService.getTransactionStats(userEmail);
    console.log('Stats returned:', JSON.stringify(stats, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error debugging transactions:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

debugTransactions();