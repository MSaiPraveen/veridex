import mongoose from 'mongoose';
import { env } from './env';

const isProduction = process.env.NODE_ENV === 'production';

const mongoOptions: mongoose.ConnectOptions = {
  dbName: 'veridex_notifications',
  maxPoolSize: isProduction ? 20 : 10,
  minPoolSize: isProduction ? 5 : 1,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: isProduction ? 10000 : 30000,
};

export async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(env.MONGO_URI, mongoOptions);
    console.log('Connected to MongoDB (notification-service)');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectMongo(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB (notification-service)');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}
