import { Request, Response, NextFunction } from 'express';
import * as service from './site-visits.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteVisits, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, siteVisits, 200, meta);
  } catch (err) { next(err); }
};

export const stats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.stats(req.tenantId!, req));
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

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.updateStatus(req.tenantId!, req.user!.id, req.params.id, req.body.status));
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Site visit deleted' });
  } catch (err) { next(err); }
};
