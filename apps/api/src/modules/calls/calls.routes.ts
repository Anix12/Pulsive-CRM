import { Router } from 'express';
import * as controller from './calls.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { InitiateCallSchema, SessionCallSchema, CallOutcomeSchema, DisposeLeadSchema } from './calls.types';

const router = Router();

// Public webhook — Twilio calls this, no auth
router.post('/webhook/twilio', controller.twilioWebhook);
router.all('/twiml/bridge/:callId', controller.bridgeTwiml);

// Protected routes
router.use(authenticate, requireActiveTenant);
router.get('/', controller.list);
router.get('/session/pending', controller.pendingOutcome);
router.post('/session', validate(SessionCallSchema), controller.startSessionCall);
router.post('/session/dispose', validate(DisposeLeadSchema), controller.disposeLead);
router.post('/:id/outcome', validate(CallOutcomeSchema), controller.recordOutcome);
router.post('/:id/hangup', controller.hangup);
router.get('/:id', controller.getById);
router.post('/', validate(InitiateCallSchema), controller.initiateCall);

export default router;
