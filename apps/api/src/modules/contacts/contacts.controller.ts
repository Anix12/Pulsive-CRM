import { Request, Response, NextFunction } from 'express';
import * as service from './contacts.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contacts, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, contacts, 200, meta);
  } catch (err) { next(err); }
};

export const overview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const range = (req.query.range as string) || 'all';
    sendSuccess(res, await service.overview(req.tenantId!, range));
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await service.getById(req.tenantId!, req.params.id);
    sendSuccess(res, contact);
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await service.create(req.tenantId!, req.user!.id, req.body);
    sendSuccess(res, contact, 201);
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await service.update(req.tenantId!, req.user!.id, req.params.id, req.body);
    sendSuccess(res, contact);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { message: 'Contact deleted' });
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

    const result = await service.importCsv(req.tenantId!, req.user!.id, req.file.buffer, mapping);
    sendSuccess(res, result, 200);
  } catch (err) { next(err); }
};
