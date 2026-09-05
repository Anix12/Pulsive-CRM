import { Router } from 'express';
import * as controller from './forecast.controller';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.salesForecast);

export default router;
