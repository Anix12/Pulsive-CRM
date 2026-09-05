import { Router } from 'express';
import * as controller from './admin.controller';
import { validate } from '@/middleware/validate';
import { authenticate, authenticateSuperAdmin } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { z } from 'zod';

const router = Router();

// Super admin login — separate from tenant login
router.post(
  '/login',
  authRateLimiter,
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  controller.login,
);

// All admin routes require super admin JWT
router.use(authenticateSuperAdmin);

router.get('/tenants', controller.listTenants);
router.get('/tenants/:tenantId', controller.getTenant);
router.post('/tenants/:tenantId/impersonate', controller.impersonateTenant);
router.patch('/tenants/:tenantId/status', validate(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']) })), controller.updateTenantStatus);
router.get('/tenants/:tenantId/audit-logs', controller.getAuditLogs);
router.get('/impersonation-logs', controller.getImpersonationLogs);

export default router;
