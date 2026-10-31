import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { login, me } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
