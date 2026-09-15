import { Router } from 'express';
import * as controller from './facebook-oauth.controller';
import { authenticate, requireRole } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';

const router = Router();

// Public — Facebook redirects the tenant's browser here directly, with no
// Authorization header available.
router.get('/callback', controller.callback);

router.get('/connect', authenticate, requireActiveTenant, requireRole('OWNER', 'ADMIN'), controller.connect);
router.get('/pending/:selectionId', authenticate, requireActiveTenant, controller.getPending);
router.post('/select-page', authenticate, requireActiveTenant, requireRole('OWNER', 'ADMIN'), controller.selectPage);
router.post('/disconnect', authenticate, requireActiveTenant, requireRole('OWNER', 'ADMIN'), controller.disconnect);

export default router;
