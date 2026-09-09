import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import * as service from './real-estate-stage.service';
import { sendSuccess } from '@/utils/response';

export const getStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.getStage(req.tenantId!, req.params.contactId);
    if (!result) throw new AppError(404, 'NOT_FOUND', 'Contact not found');
    sendSuccess(res, result);
  } catch (err) { next(err); }
};
