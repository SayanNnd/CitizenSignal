import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(Object.assign(new Error('Authentication required'), { status: 401 }));
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return next(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
  }
  (req as any).user = data.user;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  const { data } = await supabase.auth.getUser(token);
  if (data?.user) (req as any).user = data.user;
  next();
}
