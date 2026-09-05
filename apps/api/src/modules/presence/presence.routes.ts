import { Router } from 'express';
import * as controller from './presence.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { StartBreakSchema } from './presence.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.post('/heartbeat', controller.heartbeat);
router.post('/break/start', validate(StartBreakSchema), controller.startBreak);
router.post('/break/end', controller.endBreak);
router.get('/me', controller.getMyPresence);
router.get('/agents', controller.listAgentFloor);

export default router;
