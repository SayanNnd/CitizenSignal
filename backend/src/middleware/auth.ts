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

/** Verifies the token with Supabase Auth. Returns null for missing, invalid or expired tokens. */
async function verifyToken(token: string): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
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
