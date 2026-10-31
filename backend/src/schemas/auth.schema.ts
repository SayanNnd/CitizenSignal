import { z } from 'zod';

/** Body of `POST /api/auth/login`. 6 is Supabase's default minimum; 72 is bcrypt's limit. */
export const LoginBodySchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address')),
  password: z
    .string({ error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be 72 characters or fewer'),
});
