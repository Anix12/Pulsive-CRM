import { Request, Response, NextFunction } from 'express';
import * as service from './engagement-forms.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.list(req.tenantId!)); } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.getById(req.tenantId!, req.params.id)); } catch (err) { next(err); }
};

export const resolve = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.resolve(req.tenantId!, req.query.campaignId as string | undefined)); } catch (err) { next(err); }
};

export const save = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.save(req.tenantId!, req.user!.id, req.params.id, req.body), 201); } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.remove(req.tenantId!, req.params.id); sendSuccess(res, { deleted: true }); } catch (err) { next(err); }
};
