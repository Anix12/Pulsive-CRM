import { Router } from 'express';
import * as controller from './ai-sales-coach.controller';
import { authenticate, requireRole } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/overview', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.overview);
router.get('/live-calls', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.liveCalls);
router.get('/activity', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.activity);

// Agent-facing AI Coach — scoped to the calling agent's own leads, any role may use it.
router.get('/my-leads', controller.myLeads);
router.post('/coach-reply', controller.coachReply);
router.post('/call-summary', controller.callSummary);
router.post('/kb-ask', controller.kbAsk);
router.post('/finish-call', controller.finishCall);

export default router;
