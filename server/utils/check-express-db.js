// Check database connection by manually connecting to same DB as Express
import mongoose from 'mongoose';

async function checkExpressDb() {
  try {
    // Use the exact same connection string as the Express app
    const connectionString = 'mongodb+srv://vpayal:ARRJ38ec1igL4hUn@rwa.yefh5sn.mongodb.net/admin_platform';
    console.log('Connecting to:', connectionString);
    
    await mongoose.connect(connectionString);
    console.log('Connected successfully');
    console.log('Database name:', mongoose.connection.db?.databaseName);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

checkExpressDb();