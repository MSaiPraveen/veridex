import { app } from './app';
import { connectMongo, disconnectMongo } from './config/mongo';
import { startComplianceConsumer, stopComplianceConsumer } from './events/compliance.consumer';
import { disconnectProducer } from './events/product.producer';
import { env } from './config/env';

async function start() {
  try {
    // Connect to MongoDB
    await connectMongo();
    console.log('[Product Service] MongoDB connected');

    // Start Kafka consumer
    try {
      await startComplianceConsumer();
      console.log('[Product Service] Kafka consumer started');
    } catch (error) {
      console.warn('[Product Service] Kafka consumer failed to start (will retry):', error);
    }

    // Start server
    await app.listen({
      port: Number(env.PORT),
      host: '0.0.0.0',
    });

    console.log(`[Product Service] Server running on port ${env.PORT}`);
  } catch (error) {
    console.error('[Product Service] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n[Product Service] Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close HTTP server
    await app.close();
    console.log('[Product Service] HTTP server closed');

    // Stop Kafka consumer
    try {
      await stopComplianceConsumer();
      console.log('[Product Service] Kafka consumer stopped');
    } catch (e) {
      console.warn('[Product Service] Error stopping consumer:', e);
    }

    // Disconnect from Kafka producer
    await disconnectProducer();
    console.log('[Product Service] Kafka producer disconnected');

    // Disconnect from MongoDB
    await disconnectMongo();
    console.log('[Product Service] MongoDB disconnected');

    console.log('[Product Service] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Product Service] Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Product Service] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Product Service] Unhandled rejection at:', promise, 'reason:', reason);
});

start();
