import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3007'),
  MONGO_URI: z.string(),
  KAFKA_BROKER: z.string(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.string(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),
});

export const env = envSchema.parse(process.env);
