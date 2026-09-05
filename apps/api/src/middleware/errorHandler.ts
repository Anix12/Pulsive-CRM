import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';
import { sendError } from '@/utils/response';
import { logger } from '@/utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', err.flatten().fieldErrors);
    return;
  }

  // Unexpected errors — capture in Sentry
  logger.error('Unhandled error', { err, path: req.path, method: req.method });
  Sentry.captureException(err);

  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};
