import { app } from './app';
import { connectMongo, disconnectMongo } from './config/mongo';
import { disconnectProducer } from './events/document.producer';
import { env } from './config/env';
import fs from 'fs';

async function start() {
  try {
    // Ensure storage directories exist
    const storagePath = env.FILE_STORAGE_PATH;
    const tempPath = `${storagePath}/temp`;
    
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
      console.log(`[Document Service] Created storage directory: ${storagePath}`);
    }
    
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
      console.log(`[Document Service] Created temp directory: ${tempPath}`);
    }

    // Connect to MongoDB
    await connectMongo();
    console.log('[Document Service] MongoDB connected');

    // Start server
    await app.listen({
      port: Number(env.PORT),
      host: '0.0.0.0',
    });

    console.log(`[Document Service] Server running on port ${env.PORT}`);
  } catch (error) {
    console.error('[Document Service] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n[Document Service] Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close HTTP server
    await app.close();
    console.log('[Document Service] HTTP server closed');

    // Disconnect from Kafka producer
    await disconnectProducer();
    console.log('[Document Service] Kafka producer disconnected');

    // Disconnect from MongoDB
    await disconnectMongo();
    console.log('[Document Service] MongoDB disconnected');

    console.log('[Document Service] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Document Service] Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Document Service] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Document Service] Unhandled rejection at:', promise, 'reason:', reason);
});

start();
