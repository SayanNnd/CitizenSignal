import { Request, Response } from 'express';
import { isAdminEmail } from '../config/admin.js';
import { HttpError } from '../lib/http-error.js';
import { LoginBodySchema } from '../schemas/auth.schema.js';
import { signInOrRegister } from '../services/auth.service.js';

/** 201 when the account was just created, 200 when it already existed. */
export async function login(req: Request, res: Response) {
  const { email, password } = LoginBodySchema.parse(req.body ?? {});
  const { session, created } = await signInOrRegister(email, password);
  res.status(created ? 201 : 200).json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    created,
    is_admin: isAdminEmail(session.user.email),
  });
}

/** Who the token belongs to. The app calls this on start, since a restored session skips login. */
export async function me(req: Request, res: Response) {
  if (!req.user) throw HttpError.unauthorized();
  res.json({ id: req.user.id, email: req.user.email ?? null, is_admin: req.user.is_admin });
}
