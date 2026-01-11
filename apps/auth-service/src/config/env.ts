import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001'),
  MONGO_URI: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  ACCESS_TOKEN_TTL: z.string(),
  REFRESH_TOKEN_TTL: z.string(),
  KAFKA_BROKER: z.string(),
});

export const env = envSchema.parse(process.env);
