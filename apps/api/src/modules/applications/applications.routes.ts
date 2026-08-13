import { Router } from 'express';
import * as controller from './applications.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateApplicationSchema, UpdateApplicationSchema } from './applications.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/funnel', controller.funnel);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(CreateApplicationSchema), controller.create);
router.patch('/:id', validate(UpdateApplicationSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;
