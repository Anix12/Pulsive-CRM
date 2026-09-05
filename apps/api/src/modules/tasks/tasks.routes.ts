import { Router } from 'express';
import * as controller from './tasks.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateTaskSchema, UpdateTaskSchema } from './tasks.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(CreateTaskSchema), controller.create);
router.patch('/:id/complete', controller.complete);
router.patch('/:id', validate(UpdateTaskSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;
