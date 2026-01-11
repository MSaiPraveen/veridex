import { app } from './app';
import { connectMongo, disconnectMongo } from './config/mongo';
import { startDocumentConsumer, stopDocumentConsumer } from './events/document.consumer';
import { disconnectProducer } from './events/compliance.producer';
import { env } from './config/env';

async function start(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectMongo();

    // Start Kafka consumers
    await startDocumentConsumer();

    // Start HTTP server
    await app.listen({
      port: Number(env.PORT),
      host: '0.0.0.0',
    });

    console.log(`Compliance service listening on port ${env.PORT}`);
  } catch (error) {
    console.error('Failed to start compliance service:', error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log('Shutting down compliance service...');

  try {
    // Close HTTP server
    await app.close();

    // Stop Kafka consumers and producers
    await stopDocumentConsumer();
    await disconnectProducer();

    // Disconnect from MongoDB
    await disconnectMongo();

    console.log('Compliance service shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
