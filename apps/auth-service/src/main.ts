import { buildApp } from './app';
import { connectMongo, disconnectMongo } from './config/mongo';
import { disconnectProducer } from './events/auth.producer';
import { env } from './config/env';

const app = buildApp();

async function start() {
  try {
    // Connect to MongoDB
    console.log('[MongoDB] Connecting...');
    await connectMongo();
    console.log('[MongoDB] Connected successfully');

    // Start HTTP server
    const address = await app.listen({ 
      port: Number(env.PORT), 
      host: '0.0.0.0' 
    });
    console.log(`[Server] auth-service running at ${address}`);
    console.log(`[Server] Health check available at ${address}/health`);

  } catch (error) {
    console.error('[Startup] Failed to start auth-service:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close HTTP server (stop accepting new requests)
    await app.close();
    console.log('[Shutdown] HTTP server closed');

    // Disconnect Kafka producer
    await disconnectProducer();
    console.log('[Shutdown] Kafka producer disconnected');

    // Disconnect MongoDB
    await disconnectMongo();
    console.log('[Shutdown] MongoDB disconnected');

    console.log('[Shutdown] Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('[Shutdown] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Fatal] Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal] Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start the service
start();
