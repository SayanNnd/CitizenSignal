import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { ErrorCode, ErrorDetail, HttpError } from '../lib/http-error.js';

const MULTER_MESSAGES: Partial<Record<multer.ErrorCode, string>> = {
  LIMIT_FILE_SIZE: 'Photo must be 5 MB or smaller',
  LIMIT_UNEXPECTED_FILE: 'Only one photo is allowed, in the "photo" field',
};

function codeForStatus(status: number): ErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 404) return 'NOT_FOUND';
  if (status >= 400 && status < 500) return 'VALIDATION_ERROR';
  return 'SERVER_ERROR';
}

function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;

  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return HttpError.validation('Validation failed', details);
  }

  if (err instanceof multer.MulterError) {
    const message = MULTER_MESSAGES[err.code] ?? err.message;
    return HttpError.validation(message, [{ field: err.field ?? 'photo', message }]);
  }

  // body-parser errors (e.g. malformed JSON) carry a 4xx status and a safe message.
  const status = (err as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new HttpError(status, codeForStatus(status), (err as Error).message);
  }

  return new HttpError(500, 'SERVER_ERROR', 'Something went wrong on the server');
}

/** Formats every error as `{ error: { code, message, details } }`. Must be registered last. */
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const httpError = toHttpError(err);

  if (httpError.status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  } else {
    console.warn(`[${req.method} ${req.originalUrl}] ${httpError.status} ${httpError.message}`);
  }

  res.status(httpError.status).json({
    error: {
      code: httpError.code,
      message: httpError.message,
      details: httpError.details,
    },
  });
}

/** Unknown routes get the same error shape as everything else. */
export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound(`No route for ${req.method} ${req.path}`));
}
