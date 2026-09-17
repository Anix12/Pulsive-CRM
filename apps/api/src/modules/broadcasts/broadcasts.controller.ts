import { Request, Response, NextFunction } from 'express';
import * as service from './broadcasts.service';
import { sendSuccess } from '@/utils/response';

export const previewAudience = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.previewAudience(req.tenantId!, req.body));
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.create(req.tenantId!, req.user!.id, req.body), 201);
  } catch (err) { next(err); }
};

export const resend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.resend(req.tenantId!, req.params.id as string));
  } catch (err) { next(err); }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { broadcasts, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, broadcasts, 200, meta);
  } catch (err) { next(err); }
};

export const overview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.overview(req.tenantId!));
  } catch (err) { next(err); }
};
