import mongoose from 'mongoose';
import { env } from './env';

// Connection options for production
const connectionOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(env.MONGO_URI, connectionOptions);
    
    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('[MongoDB] Connection established');
    });
    
    mongoose.connection.on('error', (error) => {
      console.error('[MongoDB] Connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('[MongoDB] Connection disconnected');
    });
    
  } catch (error) {
    console.error('[MongoDB] Failed to connect:', error);
    throw error;
  }
}

export async function disconnectMongo(): Promise<void> {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed');
  } catch (error) {
    console.error('[MongoDB] Error closing connection:', error);
    throw error;
  }
}

export function getConnectionState(): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}
