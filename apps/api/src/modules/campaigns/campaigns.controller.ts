import { Request, Response, NextFunction } from 'express';
import * as service from './campaigns.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaigns, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, campaigns, 200, meta);
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await service.getById(req.tenantId!, req.params.id);
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await service.create(req.tenantId!, req.user!.id, req.body);
    sendSuccess(res, campaign, 201);
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await service.update(req.tenantId!, req.user!.id, req.params.id, req.body);
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Campaign deleted' });
  } catch (err) { next(err); }
};

export const intelligence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.campaignIntelligence(req.tenantId!));
  } catch (err) { next(err); }
};

export const categories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.categories(req.tenantId!));
  } catch (err) { next(err); }
};

export const togglePin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.togglePin(req.tenantId!, req.params.id));
  } catch (err) { next(err); }
};

export const importCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'CSV file required' } });
      return;
    }
    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(req.body.mapping || '{}'); } catch { /* use empty mapping */ }

    const result = await service.importCsv(req.tenantId!, req.user!.id, req.params.id, req.file.buffer, mapping);
    sendSuccess(res, result, 200);
  } catch (err) { next(err); }
};
