import { Router } from 'express';
import * as controller from './broadcasts.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { AudienceFilterSchema, CreateBroadcastSchema } from './broadcasts.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.get('/overview', controller.overview);
router.post('/preview-audience', validate(AudienceFilterSchema), controller.previewAudience);
router.post('/', validate(CreateBroadcastSchema), controller.create);
router.post('/:id/resend', controller.resend);

export default router;
