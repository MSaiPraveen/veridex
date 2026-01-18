/**
 * MongoDB Memory Server Test Helper
 * Provides an in-memory MongoDB instance for integration tests
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

/**
 * Connect to in-memory MongoDB for testing
 */
export async function connectTestDB(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri, {
    maxPoolSize: 10,
  });
}

/**
 * Disconnect and cleanup
 */
export async function disconnectTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Clear all collections (for test isolation)
 * Only deletes documents, keeps indexes intact for proper constraint testing
 */
export async function clearTestDB(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  
  // Ensure indexes are synced (this recreates any missing indexes)
  for (const modelName of mongoose.modelNames()) {
    try {
      await mongoose.model(modelName).syncIndexes();
    } catch {
      // Ignore errors on syncing indexes
    }
  }
}

/**
 * Get the test database URI
 */
export function getTestDBUri(): string {
  if (!mongoServer) {
    throw new Error('MongoDB Memory Server not started');
  }
  return mongoServer.getUri();
}
