import { Router } from 'express';
import * as controller from './integrations.controller';
import { authenticate, requireRole } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.post('/:type', requireRole('OWNER', 'ADMIN'), controller.save);
router.delete('/:type', requireRole('OWNER', 'ADMIN'), controller.disconnect);

export default router;
