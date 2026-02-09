import 'dotenv/config';
import { requireEnv, getEnv } from '@veridex/shared';

export const env = {
  PORT: getEnv('PORT', '3005'),
  MONGO_URI: requireEnv('MONGO_URI', 'mongodb://localhost:27017/veridex_documents'),
  KAFKA_BROKER: getEnv('KAFKA_BROKER', 'localhost:9092'),
  FILE_STORAGE_PATH: getEnv('FILE_STORAGE_PATH', './uploads'),
};
