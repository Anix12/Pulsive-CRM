import { Router } from 'express';
import * as controller from './engagement-forms.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { SaveEngagementFormSchema } from './engagement-forms.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.get('/resolve', controller.resolve);
router.get('/:id', controller.getById);
router.post('/', validate(SaveEngagementFormSchema), controller.save);
router.patch('/:id', validate(SaveEngagementFormSchema), controller.save);
router.delete('/:id', controller.remove);

export default router;
