import { apiFetch } from './client';
import type { LoginResponse, Me } from '../types';

/** Signs in, or creates the account first if the email is new. Sent without a token: this is how you get one. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), token: null });
}

/** The logged-in account, including whether it is an admin. Needed on start, when a saved session skips login. */
export async function getMe(): Promise<Me> {
  return apiFetch('/api/auth/me');
}
