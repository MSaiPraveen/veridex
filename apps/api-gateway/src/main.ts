import { buildApp } from './app';
import { env } from './config/env';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance | null = null;
let isShuttingDown = false;

/**
 * Graceful shutdown handler
 * Ensures clean termination of all connections
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log(`[API Gateway] Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  console.log(`\n[API Gateway] Received ${signal}. Starting graceful shutdown...`);

  // Set a timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    console.error('[API Gateway] Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  try {
    // Close the Fastify server (stops accepting new connections)
    if (app) {
      console.log('[API Gateway] Closing HTTP server...');
      await app.close();
      console.log('[API Gateway] HTTP server closed');
    }

    clearTimeout(forceShutdownTimeout);
    console.log('[API Gateway] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[API Gateway] Error during shutdown:', error);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
}

/**
 * Start the API Gateway
 */
async function start(): Promise<void> {
  try {
    app = await buildApp();
    
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    console.log(`🚀 API Gateway running on port ${env.PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[API Gateway] Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[API Gateway] Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (err) {
    console.error('[API Gateway] Failed to start:', err);
    process.exit(1);
  }
}

start();

