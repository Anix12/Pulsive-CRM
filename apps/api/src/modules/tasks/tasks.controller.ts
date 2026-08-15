import { Request, Response, NextFunction } from 'express';
import * as service from './tasks.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tasks, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, tasks, 200, meta);
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await service.getById(req.tenantId!, req.params.id);
    sendSuccess(res, task);
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await service.create(req.tenantId!, req.user!.id, req.body);
    sendSuccess(res, task, 201);
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await service.update(req.tenantId!, req.user!.id, req.params.id, req.body);
    sendSuccess(res, task);
  } catch (err) { next(err); }
};

export const complete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await service.complete(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, task);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Task deleted' });
  } catch (err) { next(err); }
};
