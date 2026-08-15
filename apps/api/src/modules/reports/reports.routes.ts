import { Router } from 'express';
import * as controller from './reports.controller';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { requireRole } from '@/middleware/auth';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/dashboard-overview', controller.dashboardOverview);
router.get('/business-performance', controller.businessPerformance);
router.get('/employee-attribution', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.employeeAttribution);
router.get('/ai-vs-human', controller.aiVsHuman);

export default router;
