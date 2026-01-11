import { app } from './app';
import { connectMongo, disconnectMongo } from './config/mongo';
import { env } from './config/env';
import { disconnectProducer } from './events/user-org.producer';
import { startAuthConsumer, disconnectAuthConsumer } from './events/auth.consumer';

async function start() {
  try {
    // Connect to MongoDB
    await connectMongo();
    console.log('[UserOrg Service] MongoDB connected');

    // Start Kafka consumer for auth events
    await startAuthConsumer();
    console.log('[UserOrg Service] Auth event consumer started');

    // Start server
    await app.listen({
      port: Number(env.PORT),
      host: '0.0.0.0',
    });

    console.log(`[UserOrg Service] Server running on port ${env.PORT}`);
  } catch (error) {
    console.error('[UserOrg Service] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n[UserOrg Service] Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close HTTP server
    await app.close();
    console.log('[UserOrg Service] HTTP server closed');

    // Disconnect from Kafka consumer
    await disconnectAuthConsumer();
    console.log('[UserOrg Service] Auth consumer disconnected');

    // Disconnect from Kafka producer
    await disconnectProducer();
    console.log('[UserOrg Service] Kafka producer disconnected');

    // Disconnect from MongoDB
    await disconnectMongo();
    console.log('[UserOrg Service] MongoDB disconnected');

    console.log('[UserOrg Service] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[UserOrg Service] Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[UserOrg Service] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UserOrg Service] Unhandled rejection at:', promise, 'reason:', reason);
});

start();
