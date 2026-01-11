import mongoose from 'mongoose';
import { log } from './logger';

/**
 * Multi-database connection manager for scripts.
 * 
 * Scripts often need to touch multiple service databases.
 * This utility maintains separate connections and handles cleanup.
 */

const connections: Map<string, mongoose.Connection> = new Map();

/**
 * Connect to a database by name and URI.
 * Reuses existing connections if already open.
 */
export async function connect(name: string, uri: string): Promise<mongoose.Connection> {
  const existing = connections.get(name);
  if (existing && existing.readyState === 1) {
    return existing;
  }

  log.info(`Connecting to database: ${name}`);
  
  const conn = await mongoose.createConnection(uri).asPromise();
  connections.set(name, conn);
  
  log.success(`Connected to ${name}`);
  return conn;
}

/**
 * Get an existing connection by name.
 * Throws if not connected.
 */
export function getConnection(name: string): mongoose.Connection {
  const conn = connections.get(name);
  if (!conn) {
    throw new Error(`No connection found for database: ${name}`);
  }
  return conn;
}

/**
 * Check if a connection exists and is ready.
 */
export function isConnected(name: string): boolean {
  const conn = connections.get(name);
  return conn?.readyState === 1;
}

/**
 * Disconnect from a specific database.
 */
export async function disconnect(name: string): Promise<void> {
  const conn = connections.get(name);
  if (conn) {
    await conn.close();
    connections.delete(name);
    log.info(`Disconnected from ${name}`);
  }
}

/**
 * Disconnect from all databases.
 * Must be called at end of seed process.
 */
export async function disconnectAll(): Promise<void> {
  const names = Array.from(connections.keys());
  
  await Promise.all(
    names.map(async (name) => {
      const conn = connections.get(name);
      if (conn) {
        await conn.close();
      }
    })
  );
  
  connections.clear();
  log.info('All database connections closed');
}

/**
 * Get all active connection names.
 */
export function getActiveConnections(): string[] {
  return Array.from(connections.keys());
}
