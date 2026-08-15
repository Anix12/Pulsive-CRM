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
    sendSuccess(res, await service.dashboardOverview(req.tenantId!));
  } catch (err) { next(err); }
};
