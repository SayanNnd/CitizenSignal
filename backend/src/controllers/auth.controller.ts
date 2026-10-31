import { Request, Response } from 'express';
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
  });
}
