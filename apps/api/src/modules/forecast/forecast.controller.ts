import { Request, Response, NextFunction } from 'express';
import * as service from './forecast.service';
import { sendSuccess } from '@/utils/response';

export const salesForecast = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.salesForecast(req.tenantId!)); }
  catch (err) { next(err); }
};
