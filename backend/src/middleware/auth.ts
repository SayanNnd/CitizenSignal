import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { HttpError } from '../lib/http-error.js';
import type { AuthUser } from '../types/index.js';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Public name shown on comments: "Meera Krishnan" → "Meera K.". Comes from the Google profile;
 * never derived from the email, so addresses aren't exposed. No name → "Citizen".
 */
function displayName(metadata: Record<string, unknown> | undefined): string {
  const full = metadata?.full_name ?? metadata?.name;
  if (typeof full !== 'string' || !full.trim()) return 'Citizen';
  const [first, ...rest] = full.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/** Verifies the token with Supabase Auth. Returns null for missing, invalid or expired tokens. */
async function verifyToken(token: string): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email, name: displayName(data.user.user_metadata) };
}

/** Rejects the request with 401 unless it carries a valid Bearer token. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(HttpError.unauthorized('Log in to do this'));

  const user = await verifyToken(token);
  if (!user) return next(HttpError.unauthorized('Session is invalid or expired, log in again'));

  req.user = user;
  next();
}

/** Attaches the user when a valid token is present; otherwise continues anonymously. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const user = await verifyToken(token);
    if (user) req.user = user;
  }
  next();
}
