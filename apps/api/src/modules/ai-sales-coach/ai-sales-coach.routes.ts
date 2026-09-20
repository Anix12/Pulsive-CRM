import { Router } from 'express';
import * as controller from './ai-sales-coach.controller';
import { authenticate, requireRole } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/overview', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.overview);
router.get('/live-calls', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.liveCalls);
router.get('/activity', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.activity);

export default router;
