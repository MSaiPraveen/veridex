import 'dotenv/config';
import { requireSecret, requireEnv, getEnv, getEnvArray, getEnvNumber } from '@veridex/shared';

const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3002),  // API Gateway default port is 3002

  // JWT secret for regular user verification (same as auth-service JWT_ACCESS_SECRET)
  JWT_SECRET: requireSecret('JWT_SECRET', 'dev-jwt-secret-at-least-32-chars-long'),
  
  // Admin JWT secret for admin token verification (same as auth-service ADMIN_JWT_SECRET)
  ADMIN_JWT_SECRET: requireSecret('ADMIN_JWT_SECRET', 'admin-jwt-secret-change-in-production'),

  REDIS_URL: requireEnv('REDIS_URL', 'redis://localhost:6379'),

  KAFKA_BROKERS: getEnvArray('KAFKA_BROKERS', ['localhost:9092']),
  
  // Internal service authentication
  INTERNAL_SERVICE_KEY: requireSecret('INTERNAL_SERVICE_KEY', 'dev-internal-key-at-least-32-characters'),
  
  // CORS configuration
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3008'),
  ADMIN_FRONTEND_URL: getEnv('ADMIN_FRONTEND_URL', 'http://localhost:4000'),
  
  // Production-only: allowed origins (comma-separated)
  ALLOWED_ORIGINS: isProduction 
    ? getEnvArray('ALLOWED_ORIGINS') 
    : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3008', 'http://localhost:4000'],
};
