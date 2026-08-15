import { Router } from 'express';
import * as controller from './reports.controller';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { requireRole } from '@/middleware/auth';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/dashboard-overview', controller.dashboardOverview);
router.get('/business-performance', controller.businessPerformance);
router.get('/employee-attribution', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.employeeAttribution);
router.get('/ai-vs-human', controller.aiVsHuman);

// Report catalog
router.get('/call-disposition', controller.callDisposition);
router.get('/sms', controller.sms);
router.get('/email', controller.email);
router.get('/follow-up', controller.followUp);
router.get('/login-activity', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.loginActivity);
router.get('/lead-stage', controller.leadStage);
router.get('/import-logs', controller.importLogs);
router.get('/agent-performance', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.agentPerformance);
router.get('/campaign-performance', controller.campaignPerformance);
router.get('/lead-source', controller.leadSource);
router.get('/pipeline-funnel', controller.pipelineFunnel);
router.get('/call-report', controller.callReport);
router.get('/campaign-call-logs', controller.campaignCallLogs);
router.get('/break-report', requireRole('OWNER', 'ADMIN', 'MANAGER'), controller.breakReport);

export default router;
