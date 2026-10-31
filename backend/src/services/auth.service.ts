import { createClient, type AuthError, type Session } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { HttpError } from '../lib/http-error.js';

/**
 * Password sign-in on a throwaway client. Signing in on the shared service-role client would
 * store the session on it and make every later request act as this user (and hit RLS).
 */
function passwordSignIn(email: string, password: string) {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client.auth.signInWithPassword({ email, password });
}

function toLoginError(error: AuthError | null): HttpError {
  switch (error?.code) {
    case 'email_provider_disabled':
      return new HttpError(503, 'SERVER_ERROR', 'Email login is turned off in Supabase (Authentication → Sign In / Providers → Email)');
    case 'weak_password':
      return HttpError.validation(error.message, [{ field: 'password', message: error.message }]);
    case 'over_request_rate_limit':
      return new HttpError(429, 'VALIDATION_ERROR', 'Too many attempts, wait a minute and try again');
    default:
      return new HttpError(502, 'SERVER_ERROR', `Could not log in: ${error?.message ?? 'no session returned'}`);
  }
}

export interface LoginResult {
  session: Session;
  /** True when this call created the account. */
  created: boolean;
}

/**
 * One step for both cases: sign in, and if the email has no account yet, create it and sign in.
 * Accounts are created already confirmed, so no confirmation email or OTP is ever sent.
 */
export async function signInOrRegister(email: string, password: string): Promise<LoginResult> {
  const first = await passwordSignIn(email, password);
  if (first.data.session) return { session: first.data.session, created: false };
  if (first.error?.code !== 'invalid_credentials') throw toLoginError(first.error);

  // Either the password is wrong or there is no account. Trying to create one tells them apart.
  const { error: createError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError) {
    if (createError.code === 'email_exists' || createError.code === 'user_already_exists') {
      throw HttpError.unauthorized('Wrong password for this email');
    }
    throw toLoginError(createError);
  }

  const second = await passwordSignIn(email, password);
  if (!second.data.session) throw toLoginError(second.error);
  return { session: second.data.session, created: true };
}
