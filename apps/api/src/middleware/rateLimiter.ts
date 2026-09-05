import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { RATE_LIMIT } from '@/config/constants';
import { sendError } from '@/utils/response';

const handler = (_req: Request, res: Response) => {
  sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please slow down.');
};

export const globalRateLimiter = rateLimit({
  ...RATE_LIMIT.GLOBAL,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const authRateLimiter = rateLimit({
  ...RATE_LIMIT.AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => req.ip || 'unknown',
});

export const apiKeyRateLimiter = rateLimit({
  ...RATE_LIMIT.API_KEY,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => req.headers.authorization || req.ip || 'unknown',
});
