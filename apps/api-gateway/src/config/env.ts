import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),

  // JWT secret for verification (same as auth-service access secret)
  JWT_SECRET: required('JWT_SECRET'),

  REDIS_URL: required('REDIS_URL'),

  KAFKA_BROKERS: required('KAFKA_BROKERS').split(','),
};
