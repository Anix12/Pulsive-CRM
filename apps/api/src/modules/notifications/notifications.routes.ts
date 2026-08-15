import { Router } from 'express';
import * as controller from './notifications.controller';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.patch('/:id/read', controller.markRead);
router.post('/read-all', controller.markAllRead);

export default router;
