import { Router } from 'express';
import * as controller from './workflows.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateWorkflowSchema, UpdateWorkflowSchema } from './workflows.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/:id/executions', controller.getExecutions);
router.post('/', validate(CreateWorkflowSchema), controller.create);
router.patch('/:id', validate(UpdateWorkflowSchema), controller.update);
router.patch('/:id/toggle', controller.toggle);
router.delete('/:id', controller.remove);

export default router;
