import { Request, Response, NextFunction } from 'express';
import * as service from './workflows.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workflows, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, workflows, 200, meta);
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getById(req.tenantId!, req.params.id));
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.create(req.tenantId!, req.user!.id, req.body), 201);
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.update(req.tenantId!, req.user!.id, req.params.id, req.body));
  } catch (err) { next(err); }
};

export const toggle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isActive = req.body.isActive as boolean;
    sendSuccess(res, await service.toggle(req.tenantId!, req.params.id, isActive));
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Workflow deleted' });
  } catch (err) { next(err); }
};

export const getExecutions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { executions, meta } = await service.getExecutions(req.tenantId!, req.params.id, req);
    sendSuccess(res, executions, 200, meta);
  } catch (err) { next(err); }
};
