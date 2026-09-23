import { Request, Response, NextFunction } from 'express';
import * as service from './lead-views.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.list(req.tenantId!)); } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.create(req.tenantId!, req.user!.id, req.body), 201); } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.update(req.tenantId!, req.params.id, req.body)); } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.remove(req.tenantId!, req.params.id); sendSuccess(res, { deleted: true }); } catch (err) { next(err); }
};

export const queue = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.leadQueue(req.tenantId!, req.params.id)); } catch (err) { next(err); }
};
