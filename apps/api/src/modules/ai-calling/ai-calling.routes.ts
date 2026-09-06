import { Router } from 'express';
import * as controller from './ai-calling.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateAgentSchema, UpdateAgentSchema, InitiateAiCallSchema } from './ai-calling.types';

const router = Router();

// Public webhook — Vapi calls this, no auth
router.post('/webhook/vapi', controller.vapiWebhook);

// Protected routes
router.use(authenticate, requireActiveTenant);
router.get('/agents', controller.listAgents);
router.get('/agents/:id', controller.getAgent);
router.post('/agents', validate(CreateAgentSchema), controller.createAgent);
router.patch('/agents/:id', validate(UpdateAgentSchema), controller.updateAgent);
router.delete('/agents/:id', controller.deleteAgent);
router.post('/agents/:id/call', validate(InitiateAiCallSchema), controller.initiateAiCall);

export default router;
