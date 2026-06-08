import { Request, Response, NextFunction } from 'express';
import * as service from './tenants.service';
import { sendSuccess } from '@/utils/response';

export const get = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.get(req.tenantId!));
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.update(req.tenantId!, req.user!.id, req.body));
  } catch (err) { next(err); }
};

export const updateTwilio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.updateTwilio(req.tenantId!, req.user!.id, req.body));
  } catch (err) { next(err); }
};

export const updateWhatsApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.updateWhatsApp(req.tenantId!, req.body));
  } catch (err) { next(err); }
};

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.listUsers(req.tenantId!)); } catch (err) { next(err); }
};

export const inviteUser = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.inviteUser(req.tenantId!, req.body), 201); } catch (err) { next(err); }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.updateUserRole(req.tenantId!, req.params.userId, req.body)); } catch (err) { next(err); }
};

export const removeUser = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.removeUser(req.tenantId!, req.params.userId); sendSuccess(res, { message: 'User removed' }); } catch (err) { next(err); }
};
