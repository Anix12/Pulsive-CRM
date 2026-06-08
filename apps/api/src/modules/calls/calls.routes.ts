import { Router } from 'express';
import * as controller from './calls.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { InitiateCallSchema } from './calls.types';

const router = Router();

// Public webhook — Twilio calls this, no auth
router.post('/webhook/twilio', controller.twilioWebhook);

// Protected routes
router.use(authenticate, requireActiveTenant);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(InitiateCallSchema), controller.initiateCall);

export default router;
