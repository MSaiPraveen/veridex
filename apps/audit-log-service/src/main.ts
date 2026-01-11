import { buildApp } from './app';
import { connectMongo, disconnectMongo } from './config/mongo';
import { startAuditConsumer, stopAuditConsumer } from './events/audit.consumer';
import { env } from './config/env';

let app: Awaited<ReturnType<typeof buildApp>> | null = null;

async function start() {
  try {
    await connectMongo();
    await startAuditConsumer();

    app = await buildApp();
    
    await app.listen({
      port: Number(env.PORT),
      host: '0.0.0.0',
    });

    console.log(`🚀 Audit-log-service running on port ${env.PORT}`);
  } catch (err) {
    console.error('Failed to start audit-log-service:', err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Graceful shutdown...`);
  
  try {
    if (app) await app.close();
    await stopAuditConsumer();
    await disconnectMongo();
    console.log('✅ Audit-log-service shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
