import 'dotenv/config';
import { requireEnv, getEnv } from '@veridex/shared';

export const env = {
  PORT: getEnv('PORT', '3004'),
  MONGO_URI: requireEnv('MONGO_URI', 'mongodb://localhost:27017/veridex_products'),
  KAFKA_BROKER: getEnv('KAFKA_BROKER', 'localhost:9092'),
  KAFKA_GROUP_ID: getEnv('KAFKA_GROUP_ID', 'product-service'),
};
