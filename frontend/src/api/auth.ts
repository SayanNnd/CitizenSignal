import { apiFetch } from './client';
import type { LoginResponse } from '../types';

/** Signs in, or creates the account first if the email is new. Sent without a token: this is how you get one. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), token: null });
}
