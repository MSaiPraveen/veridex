import 'dotenv/config';
import { requireEnv, getEnv } from '@veridex/shared';

export const env = {
  PORT: getEnv('PORT', '3003'),
  MONGO_URI: requireEnv('MONGO_URI', 'mongodb://localhost:27017/veridex_users'),
  KAFKA_BROKER: getEnv('KAFKA_BROKER', 'localhost:9092'),
};
