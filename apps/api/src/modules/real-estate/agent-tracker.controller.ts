import { Request, Response, NextFunction } from 'express';
import * as service from './agent-tracker.service';
import { sendSuccess } from '@/utils/response';

export const overview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.overview(req.tenantId!));
  } catch (err) { next(err); }
};

export const performance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.performance(req.tenantId!));
  } catch (err) { next(err); }
};
