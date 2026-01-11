import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3004'),
  MONGO_URI: z.string(),
  KAFKA_BROKER: z.string(),
  KAFKA_GROUP_ID: z.string(),
});

export const env = envSchema.parse(process.env);
