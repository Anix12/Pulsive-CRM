import { Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { validate } from '@/middleware/validate';
import * as service from './api-keys.service';
import { sendSuccess } from '@/utils/response';
import { z } from 'zod';

const router = Router();
router.use(authenticate, requireActiveTenant, requireRole('OWNER', 'ADMIN'));

router.get('/', async (req, res, next) => {
  try { sendSuccess(res, await service.list(req.tenantId!)); } catch (err) { next(err); }
});

router.post(
  '/',
  validate(z.object({ name: z.string().min(1), scopes: z.array(z.string()).default(['*']) })),
  async (req, res, next) => {
    try {
      sendSuccess(res, await service.create(req.tenantId!, req.user!.id, req.body.name, req.body.scopes), 201);
    } catch (err) { next(err); }
  },
);

router.delete('/:id', async (req, res, next) => {
  try {
    await service.revoke(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'API key revoked' });
  } catch (err) { next(err); }
});

export default router;
