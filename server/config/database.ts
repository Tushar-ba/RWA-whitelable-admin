import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in the environment variables');
}

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'vaulted_assets'
    });
 
    console.log(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('📦 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('📦 Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});