import { Request, Response, NextFunction } from 'express';
import * as service from './ai-calling.service';
import { sendSuccess } from '@/utils/response';

export const listAgents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.listAgents(req.tenantId!));
  } catch (err) { next(err); }
};

export const getAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getById(req.tenantId!, req.params.id));
  } catch (err) { next(err); }
};

export const createAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.createAgent(req.tenantId!, req.body), 201);
  } catch (err) { next(err); }
};

export const updateAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.updateAgent(req.tenantId!, req.params.id, req.body));
  } catch (err) { next(err); }
};

export const deleteAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteAgent(req.tenantId!, req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
};

export const initiateAiCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.initiateAiCall(req.tenantId!, req.params.id, req.body), 201);
  } catch (err) { next(err); }
};

// Public webhook endpoint — called by Vapi
export const vapiWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.handleVapiWebhook(req.body);
    res.status(200).json({ received: true });
  } catch (err) { next(err); }
};
