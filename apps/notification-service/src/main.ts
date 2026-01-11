import { app } from './app';
import { connectMongo, disconnectMongo } from './config/mongo';
import { startNotificationConsumer, stopNotificationConsumer } from './events/notification.consumer';
import { closeTransporter } from './services/email.service';
import { env } from './config/env';

async function start(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectMongo();

    // Start Kafka consumer
    await startNotificationConsumer();

    // Start HTTP server
    await app.listen({
      port: Number(env.PORT),
      host: '0.0.0.0',
    });

    console.log(`Notification service listening on port ${env.PORT}`);
  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log('Shutting down notification service...');

  try {
    // Close HTTP server
    await app.close();

    // Stop Kafka consumer
    await stopNotificationConsumer();

    // Close email transporter
    await closeTransporter();

    // Disconnect from MongoDB
    await disconnectMongo();

    console.log('Notification service shut down gracefully');
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
