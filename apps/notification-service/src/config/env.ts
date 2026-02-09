import 'dotenv/config';
import { requireEnv, requireSecret, getEnv } from '@veridex/shared';

export const env = {
  PORT: getEnv('PORT', '3007'),
  MONGO_URI: requireEnv('MONGO_URI', 'mongodb://localhost:27017/veridex_notifications'),
  KAFKA_BROKER: getEnv('KAFKA_BROKER', 'localhost:9092'),

  SMTP_HOST: requireEnv('SMTP_HOST', 'localhost'),
  SMTP_PORT: getEnv('SMTP_PORT', '587'),
  SMTP_USER: getEnv('SMTP_USER', ''),
  SMTP_PASS: requireSecret('SMTP_PASS', 'dev-smtp-password-at-least-32-characters'),
  SMTP_FROM: getEnv('SMTP_FROM', 'noreply@veridex.io'),
};
