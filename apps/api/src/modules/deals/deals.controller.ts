import { Request, Response, NextFunction } from 'express';
import * as service from './deals.service';
import { sendSuccess } from '@/utils/response';

// ── Pipelines ────────────────────────────────────────────────────────────────

export const listPipelines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.listPipelines(req.tenantId!));
  } catch (err) { next(err); }
};

// ── Stage management ───────────────────────────────────────────────────────────

export const createStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.createStage(req.tenantId!, req.body), 201);
  } catch (err) { next(err); }
};

export const updateStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.updateStage(req.tenantId!, req.params.stageId, req.body));
  } catch (err) { next(err); }
};

export const deleteStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteStage(req.tenantId!, req.params.stageId);
    sendSuccess(res, { message: 'Stage deleted' });
  } catch (err) { next(err); }
};

export const reorderStages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.reorderStages(req.tenantId!, req.body));
  } catch (err) { next(err); }
};

// ── Deal CRUD ──────────────────────────────────────────────────────────────────

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deals, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, deals, 200, meta);
  } catch (err) { next(err); }
};

export const getStages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getStages(req.tenantId!));
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

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Deal deleted' });
  } catch (err) { next(err); }
};
