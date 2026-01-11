import { buildApp } from './app';
import { env } from './config/env';

async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    console.log(`🚀 API Gateway running on port ${env.PORT}`);
  } catch (err) {
    console.error('Failed to start API Gateway:', err);
    process.exit(1);
  }
}

start();
