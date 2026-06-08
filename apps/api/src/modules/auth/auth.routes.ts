import { Router } from 'express';
import * as controller from './auth.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from './auth.types';

const router = Router();

router.post('/register', authRateLimiter, validate(RegisterSchema), controller.register);
router.post('/login', authRateLimiter, validate(LoginSchema), controller.login);
router.post('/refresh', validate(RefreshTokenSchema), controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);

export default router;
