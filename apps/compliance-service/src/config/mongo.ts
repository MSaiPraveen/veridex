import mongoose from 'mongoose';
import { env } from './env';

export async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(env.MONGO_URI, {
      dbName: 'veridex_compliance',
    });
    console.log('Connected to MongoDB (compliance-service)');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectMongo(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB (compliance-service)');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}
