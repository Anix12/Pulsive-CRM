import { Request, Response, NextFunction } from 'express';
import * as service from './settings.service';
import { sendSuccess } from '@/utils/response';

const wrap = (fn: (req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fn(req);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

// Custom Fields
export const listCustomFields = wrap((req) => service.listCustomFields(req.tenantId!, req.query.entity as string | undefined));
export const createCustomField = wrap((req) => service.createCustomField(req.tenantId!, req.body));
export const updateCustomField = wrap((req) => service.updateCustomField(req.tenantId!, req.params.id, req.body));
export const deleteCustomField = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteCustomField(req.tenantId!, req.params.id); sendSuccess(res, { message: 'Deleted' }); }
  catch (err) { next(err); }
};

// Scoring Rules
export const listScoringRules = wrap((req) => service.listScoringRules(req.tenantId!));
export const createScoringRule = wrap((req) => service.createScoringRule(req.tenantId!, req.body));
export const updateScoringRule = wrap((req) => service.updateScoringRule(req.tenantId!, req.params.id, req.body));
export const deleteScoringRule = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteScoringRule(req.tenantId!, req.params.id); sendSuccess(res, { message: 'Deleted' }); }
  catch (err) { next(err); }
};
export const recalculateScores = wrap((req) => service.recalculateScores(req.tenantId!));

// Pipelines
export const listPipelines = wrap((req) => service.listPipelines(req.tenantId!));
export const createPipeline = wrap((req) => service.createPipeline(req.tenantId!, req.body));
export const updatePipeline = wrap((req) => service.updatePipeline(req.tenantId!, req.params.id, req.body));
export const deletePipeline = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deletePipeline(req.tenantId!, req.params.id); sendSuccess(res, { message: 'Deleted' }); }
  catch (err) { next(err); }
};

// Call Dispositions
export const listCallDispositions = wrap((req) => service.listCallDispositions(req.tenantId!));
export const createCallDisposition = wrap((req) => service.createCallDisposition(req.tenantId!, req.body));
export const updateCallDisposition = wrap((req) => service.updateCallDisposition(req.tenantId!, req.params.id, req.body));
export const deleteCallDisposition = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteCallDisposition(req.tenantId!, req.params.id); sendSuccess(res, { message: 'Deleted' }); }
  catch (err) { next(err); }
};
export const copyDispositions = wrap((req) => service.copyDispositions(req.tenantId!, req.body));

// Report Schedules
export const listReportSchedules = wrap((req) => service.listReportSchedules(req.tenantId!));
export const createReportSchedule = wrap((req) => service.createReportSchedule(req.tenantId!, req.body));
export const updateReportSchedule = wrap((req) => service.updateReportSchedule(req.tenantId!, req.params.id, req.body));
export const deleteReportSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteReportSchedule(req.tenantId!, req.params.id); sendSuccess(res, { message: 'Deleted' }); }
  catch (err) { next(err); }
};

// Break Windows
export const listBreakWindows = wrap((req) => service.listBreakWindows(req.tenantId!));
export const createBreakWindow = wrap((req) => service.createBreakWindow(req.tenantId!, req.body));
export const updateBreakWindow = wrap((req) => service.updateBreakWindow(req.tenantId!, req.params.id, req.body));
export const deleteBreakWindow = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteBreakWindow(req.tenantId!, req.params.id); sendSuccess(res, { message: 'Deleted' }); }
  catch (err) { next(err); }
};

// Roles & Permissions
export const listRolePermissions = wrap((req) => service.listRolePermissions(req.tenantId!));
export const upsertRolePermission = wrap((req) => service.upsertRolePermission(req.tenantId!, req.body));
