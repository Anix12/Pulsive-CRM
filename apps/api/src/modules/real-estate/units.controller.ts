import { Request, Response, NextFunction } from 'express';
import * as service from './units.service';
import { sendSuccess } from '@/utils/response';

export const listByProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.listByProject(req.tenantId!, req.params.id, req));
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getById(req.tenantId!, req.params.id));
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.create(req.tenantId!, req.user!.id, req.params.id, req.body), 201);
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.update(req.tenantId!, req.user!.id, req.params.id, req.body));
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Unit deleted' });
  } catch (err) { next(err); }
};
