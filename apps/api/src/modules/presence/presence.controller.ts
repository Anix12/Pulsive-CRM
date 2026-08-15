import { Request, Response, NextFunction } from 'express';
import * as service from './presence.service';
import { sendSuccess } from '@/utils/response';

export const heartbeat = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.heartbeat(req.tenantId!, req.user!.id)); }
  catch (err) { next(err); }
};

export const startBreak = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.startBreak(req.tenantId!, req.user!.id, req.body)); }
  catch (err) { next(err); }
};

export const endBreak = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.endBreak(req.tenantId!, req.user!.id)); }
  catch (err) { next(err); }
};

export const getMyPresence = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.getMyPresence(req.user!.id)); }
  catch (err) { next(err); }
};

export const listAgentFloor = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.listAgentFloor(req.tenantId!)); }
  catch (err) { next(err); }
};
