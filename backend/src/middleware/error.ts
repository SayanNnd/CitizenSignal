import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  const status =
    typeof (err as any)?.status === 'number' ? (err as any).status : 500;
  const code =
    status === 401 ? 'UNAUTHORIZED' : status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';

  res.status(status).json({
    error: {
      code,
      message: (err as any)?.message ?? 'Internal server error',
      details: [],
    },
  });
}
