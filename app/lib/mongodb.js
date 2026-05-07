// app/lib/mongodb.js
import mongoose from 'mongoose';
import dns from 'dns';

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

// Use all three shards with their correct IPs (via hostnames)
const MONGODB_URI = "mongodb://accbba2026:FJNwWXffYlStMK6f@ac-dcmut4m-shard-00-00.n9oqjau.mongodb.net:27017,ac-dcmut4m-shard-00-01.n9oqjau.mongodb.net:27017,ac-dcmut4m-shard-00-02.n9oqjau.mongodb.net:27017/departmentofbba?ssl=true&replicaSet=atlas-fegf08-shard-0&authSource=admin&retryWrites=true&w=majority";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    console.log('📦 Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      family: 4,
    };

    console.log('🔄 Connecting to MongoDB Atlas replica set...');
    console.log('📍 Shards: 00-00, 00-01, 00-02');
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✅ MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export { MONGODB_URI };