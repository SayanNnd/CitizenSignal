import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string('SUPABASE_SERVICE_ROLE_KEY is required').min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  CORS_ORIGIN: z.string().default('*'),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  console.error('❌  Missing or invalid environment variables:');
  console.error(z.prettifyError(result.error));
  process.exit(1);
}

export const env = result.data;
