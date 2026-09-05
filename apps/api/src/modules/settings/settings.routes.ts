import { Router } from 'express';
import * as controller from './settings.controller';
import { validate } from '@/middleware/validate';
import { authenticate, requireRole } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import {
  CreateCustomFieldSchema, UpdateCustomFieldSchema,
  CreateScoringRuleSchema, UpdateScoringRuleSchema,
  CreatePipelineSchema, UpdatePipelineSchema,
  CreateCallDispositionSchema, UpdateCallDispositionSchema, CopyDispositionsSchema,
  CreateReportScheduleSchema, UpdateReportScheduleSchema,
  CreateBreakWindowSchema, UpdateBreakWindowSchema,
  UpdateRolePermissionSchema,
} from './settings.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

const adminOnly = requireRole('OWNER', 'ADMIN');

// Custom Fields
router.get('/custom-fields', controller.listCustomFields);
router.post('/custom-fields', adminOnly, validate(CreateCustomFieldSchema), controller.createCustomField);
router.patch('/custom-fields/:id', adminOnly, validate(UpdateCustomFieldSchema), controller.updateCustomField);
router.delete('/custom-fields/:id', adminOnly, controller.deleteCustomField);

// Scoring Rules
router.get('/scoring-rules', controller.listScoringRules);
router.post('/scoring-rules', adminOnly, validate(CreateScoringRuleSchema), controller.createScoringRule);
router.patch('/scoring-rules/:id', adminOnly, validate(UpdateScoringRuleSchema), controller.updateScoringRule);
router.delete('/scoring-rules/:id', adminOnly, controller.deleteScoringRule);
router.post('/scoring-rules/recalculate', adminOnly, controller.recalculateScores);

// Pipelines
router.get('/pipelines', controller.listPipelines);
router.post('/pipelines', adminOnly, validate(CreatePipelineSchema), controller.createPipeline);
router.patch('/pipelines/:id', adminOnly, validate(UpdatePipelineSchema), controller.updatePipeline);
router.delete('/pipelines/:id', adminOnly, controller.deletePipeline);

// Call Dispositions
router.get('/call-dispositions', controller.listCallDispositions);
router.post('/call-dispositions', adminOnly, validate(CreateCallDispositionSchema), controller.createCallDisposition);
router.patch('/call-dispositions/:id', adminOnly, validate(UpdateCallDispositionSchema), controller.updateCallDisposition);
router.delete('/call-dispositions/:id', adminOnly, controller.deleteCallDisposition);
router.post('/call-dispositions/copy', adminOnly, validate(CopyDispositionsSchema), controller.copyDispositions);

// Report Schedules
router.get('/report-schedules', controller.listReportSchedules);
router.post('/report-schedules', adminOnly, validate(CreateReportScheduleSchema), controller.createReportSchedule);
router.patch('/report-schedules/:id', adminOnly, validate(UpdateReportScheduleSchema), controller.updateReportSchedule);
router.delete('/report-schedules/:id', adminOnly, controller.deleteReportSchedule);

// Break Windows
router.get('/break-windows', controller.listBreakWindows);
router.post('/break-windows', adminOnly, validate(CreateBreakWindowSchema), controller.createBreakWindow);
router.patch('/break-windows/:id', adminOnly, validate(UpdateBreakWindowSchema), controller.updateBreakWindow);
router.delete('/break-windows/:id', adminOnly, controller.deleteBreakWindow);

// Roles & Permissions
router.get('/role-permissions', controller.listRolePermissions);
router.put('/role-permissions', adminOnly, validate(UpdateRolePermissionSchema), controller.upsertRolePermission);

export default router;
