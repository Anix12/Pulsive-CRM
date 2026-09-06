import { Request, Response, NextFunction } from 'express';
import * as service from './lead-lists.service';
import { sendSuccess } from '@/utils/response';

export const listLists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.listLists(req.tenantId!));
  } catch (err) { next(err); }
};

export const importFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'CSV or Excel file required' } });
      return;
    }
    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(req.body.mapping || '{}'); } catch { /* use empty mapping */ }

    const result = await service.importFile(
      req.tenantId!,
      req.user!.id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      mapping,
    );
    sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

export const deleteList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteList(req.tenantId!, req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
};
