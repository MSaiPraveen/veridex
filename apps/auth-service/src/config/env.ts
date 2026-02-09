import 'dotenv/config';
import { z } from 'zod';
import { requireSecret, requireEnv, getEnv } from '@veridex/shared';

// Use shared utilities for secret validation
const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  PORT: getEnv('PORT', '3001'),
  MONGO_URI: requireEnv('MONGO_URI', 'mongodb://localhost:27017/veridex_auth'),
  JWT_ACCESS_SECRET: requireSecret('JWT_ACCESS_SECRET', 'dev-access-secret-at-least-32-characters'),
  JWT_REFRESH_SECRET: requireSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret-at-least-32-characters'),
  ACCESS_TOKEN_TTL: getEnv('ACCESS_TOKEN_TTL', '15m'),
  REFRESH_TOKEN_TTL: getEnv('REFRESH_TOKEN_TTL', '7d'),
  KAFKA_BROKER: getEnv('KAFKA_BROKER', 'localhost:9092'),
};
