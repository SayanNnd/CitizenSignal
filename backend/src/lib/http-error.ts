// One error type for everything the API reports on purpose.
// `middleware/error.ts` turns it into the contract's error shape (roadmap.md §4).

export type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVER_ERROR';

export interface ErrorDetail {
  field: string;
  message: string;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static validation(message: string, details: ErrorDetail[] = []) {
    return new HttpError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You are not allowed to do this') {
    return new HttpError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found') {
    return new HttpError(404, 'NOT_FOUND', message);
  }
}
