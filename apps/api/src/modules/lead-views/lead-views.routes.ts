import { Router } from 'express';
import * as controller from './lead-views.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateLeadViewSchema, UpdateLeadViewSchema } from './lead-views.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.post('/', validate(CreateLeadViewSchema), controller.create);
router.get('/:id/queue', controller.queue);
router.patch('/:id', validate(UpdateLeadViewSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;
