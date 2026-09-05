import { Request, Response, NextFunction } from 'express';
import * as service from './reports.service';
import { sendSuccess } from '@/utils/response';

export const businessPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    sendSuccess(res, await service.businessPerformance(req.tenantId!, from, to));
  } catch (err) { next(err); }
};

export const employeeAttribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    sendSuccess(res, await service.employeeAttribution(req.tenantId!, from, to));
  } catch (err) { next(err); }
};

export const aiVsHuman = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    sendSuccess(res, await service.aiVsHuman(req.tenantId!, from, to));
  } catch (err) { next(err); }
};

export const dashboardOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    sendSuccess(res, await service.dashboardOverview(req.tenantId!, from, to));
  } catch (err) { next(err); }
};

const withRange = (fn: (tenantId: string, from?: string, to?: string) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query as Record<string, string>;
      sendSuccess(res, await fn(req.tenantId!, from, to));
    } catch (err) { next(err); }
  };

export const callDisposition = withRange(service.callDispositionReport);
export const sms = withRange(service.smsReport);
export const email = withRange(service.emailReport);
export const loginActivity = withRange(service.loginActivityReport);
export const agentPerformance = withRange(service.agentPerformanceReport);
export const breakReport = withRange(service.breakReport);

export const followUp = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.followUpReport(req.tenantId!)); }
  catch (err) { next(err); }
};

export const leadStage = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.leadStageReport(req.tenantId!)); }
  catch (err) { next(err); }
};

export const importLogs = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.importLogsReport(req.tenantId!)); }
  catch (err) { next(err); }
};

export const campaignPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.campaignPerformanceReport(req.tenantId!)); }
  catch (err) { next(err); }
};

export const leadSource = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.leadSourceReport(req.tenantId!)); }
  catch (err) { next(err); }
};

export const pipelineFunnel = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.pipelineFunnelReport(req.tenantId!)); }
  catch (err) { next(err); }
};

export const callReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { view, from, to } = req.query as Record<string, string>;
    sendSuccess(res, await service.callReport(req.tenantId!, view || 'daily', from, to));
  } catch (err) { next(err); }
};

export const campaignCallLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId } = req.query as Record<string, string>;
    sendSuccess(res, await service.campaignCallLogsReport(req.tenantId!, campaignId));
  } catch (err) { next(err); }
};
