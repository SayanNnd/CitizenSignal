// Adds the verified Supabase user to Express requests (set by middleware/auth.ts).
import type { AuthUser } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
