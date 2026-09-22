import { Request, Response, NextFunction } from 'express';
import * as service from './ai-sales-coach.service';
import { sendSuccess } from '@/utils/response';

export const overview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.overview(req.tenantId!));
  } catch (err) { next(err); }
};

export const liveCalls = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getLiveCalls(req.tenantId!));
  } catch (err) { next(err); }
};

export const activity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    sendSuccess(res, await service.getActivityFeed(req.tenantId!, limit));
  } catch (err) { next(err); }
};

export const myLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getMyLeads(req.tenantId!, req.user!.id));
  } catch (err) { next(err); }
};

export const coachReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.coachReply(req.tenantId!, req.user!.id, req.body));
  } catch (err) { next(err); }
};

export const callSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.callSummary(req.tenantId!, req.user!.id, req.body));
  } catch (err) { next(err); }
};

export const kbAsk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.kbAsk(req.tenantId!, req.user!.id, req.body));
  } catch (err) { next(err); }
};

export const finishCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.finishCoachedCall(req.tenantId!, req.user!.id, req.body));
  } catch (err) { next(err); }
};
