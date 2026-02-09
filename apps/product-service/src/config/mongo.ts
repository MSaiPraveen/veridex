import mongoose from 'mongoose';
import { env } from './env';

const isProduction = process.env.NODE_ENV === 'production';

const mongoOptions: mongoose.ConnectOptions = {
  maxPoolSize: isProduction ? 20 : 10,
  minPoolSize: isProduction ? 5 : 1,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // Production retry options for replica sets
  retryWrites: true,
  retryReads: true,
  // Faster failover detection
  heartbeatFrequencyMS: isProduction ? 10000 : 30000,
};

export async function connectMongo(): Promise<void> {
  try {
    mongoose.connection.on('connected', () => {
      console.log('[MongoDB] Connected to database');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[MongoDB] Disconnected from database');
    });

    await mongoose.connect(env.MONGO_URI, mongoOptions);
  } catch (error) {
    console.error('[MongoDB] Failed to connect:', error);
    throw error;
  }
}

export async function disconnectMongo(): Promise<void> {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error('[MongoDB] Error disconnecting:', error);
    throw error;
  }
}
