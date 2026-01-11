import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3005'),
  MONGO_URI: z.string(),
  KAFKA_BROKER: z.string(),
  FILE_STORAGE_PATH: z.string(),
});

export const env = envSchema.parse(process.env);
