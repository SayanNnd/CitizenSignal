import { env } from './env.js';

const ADMINS = new Set(env.ADMIN_EMAILS);

/**
 * Admins are the accounts whose email is listed in `ADMIN_EMAILS`. They log in through the same
 * `POST /auth/login` as everyone else; the role comes from the verified email, never the request.
 */
export function isAdminEmail(email: string | undefined): boolean {
  return !!email && ADMINS.has(email.toLowerCase());
}
