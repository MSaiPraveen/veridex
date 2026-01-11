import mongoose from 'mongoose';
import { env } from './env';

export async function connectMongo(): Promise<void> {
  await mongoose.connect(env.MONGO_URI, {
    dbName: 'veridex-audit',
  });
  console.log('📊 MongoDB connected for audit-log-service');
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  console.log('📊 MongoDB disconnected');
}
