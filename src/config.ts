import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(8080),

  // You own the Postgres. Optional at boot so /health and the simulator can run
  // before the DB is provisioned; DB-backed features throw a clear error if unset.
  DATABASE_URL: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(['twofactor', 'meta', 'threesixty']).default('twofactor'),
  WEBHOOK_VERIFY_TOKEN: z.string().default('paperplane-verify'),
  WHATSAPP_BUSINESS_NUMBER: z.string().default('910000000000'),

  TWOFACTOR_API_KEY: z.string().optional(),
  TWOFACTOR_BASE_URL: z.string().default('https://api.2factor.in'),

  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().default('ap-south-1'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
});

export const config = schema.parse(process.env);
export type Config = typeof config;

export function requireConfig<K extends keyof Config>(key: K): NonNullable<Config[K]> {
  const value = config[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<Config[K]>;
}
