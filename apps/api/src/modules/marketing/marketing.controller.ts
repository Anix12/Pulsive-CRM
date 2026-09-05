import { Request, Response, NextFunction } from 'express';
import * as service from './marketing.service';
import { sendSuccess } from '@/utils/response';

// ── Lists ────────────────────────────────────────────────────────────────────

export const listLists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lists, meta } = await service.listLists(req.tenantId!, req);
    sendSuccess(res, lists, 200, meta);
  } catch (err) { next(err); }
};

export const getListById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await service.getListById(req.tenantId!, req.params.id);
    sendSuccess(res, list);
  } catch (err) { next(err); }
};

export const createList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await service.createList(req.tenantId!, req.user!.id, req.body);
    sendSuccess(res, list, 201);
  } catch (err) { next(err); }
};

export const updateList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await service.updateList(req.tenantId!, req.user!.id, req.params.id, req.body);
    sendSuccess(res, list);
  } catch (err) { next(err); }
};

export const removeList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.removeList(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Marketing list deleted' });
  } catch (err) { next(err); }
};

export const uploadCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'CSV file required' } });
      return;
    }
    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(req.body.mapping || '{}'); } catch { /* use empty mapping */ }

    const result = await service.uploadCsv(req.tenantId!, req.user!.id, req.params.id, req.file.buffer, mapping);
    sendSuccess(res, result, 200);
  } catch (err) { next(err); }
};

// ── Campaigns (bulk sends) ──────────────────────────────────────────────────

export const listCampaigns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaigns, meta } = await service.listCampaigns(req.tenantId!, req);
    sendSuccess(res, campaigns, 200, meta);
  } catch (err) { next(err); }
};

export const getCampaignById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await service.getCampaignById(req.tenantId!, req.params.id);
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
};

export const createCampaign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await service.createCampaign(req.tenantId!, req.user!.id, req.body);
    sendSuccess(res, campaign, 201);
  } catch (err) { next(err); }
};

export const updateCampaign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await service.updateCampaign(req.tenantId!, req.user!.id, req.params.id, req.body);
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
};

export const removeCampaign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.removeCampaign(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Marketing campaign deleted' });
  } catch (err) { next(err); }
};
