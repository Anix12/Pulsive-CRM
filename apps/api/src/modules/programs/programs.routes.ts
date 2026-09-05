import { Router } from 'express';
import * as controller from './programs.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateProgramSchema, UpdateProgramSchema } from './programs.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(CreateProgramSchema), controller.create);
router.patch('/:id', validate(UpdateProgramSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;
