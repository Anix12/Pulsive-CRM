import { Request, Response, NextFunction } from 'express';
import * as service from './property-match.service';
import { sendSuccess } from '@/utils/response';

export const getPreference = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getPreference(req.tenantId!, req.params.contactId));
  } catch (err) { next(err); }
};

export const upsertPreference = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.upsertPreference(req.tenantId!, req.body));
  } catch (err) { next(err); }
};

export const matchesForContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.matchesForContact(req.tenantId!, req.params.contactId));
  } catch (err) { next(err); }
};

export const searchLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.searchLeads(req.tenantId!, req));
  } catch (err) { next(err); }
};

export const overviewStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.overviewStats(req.tenantId!));
  } catch (err) { next(err); }
};
