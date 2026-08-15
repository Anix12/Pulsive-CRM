import { Request, Response, NextFunction } from 'express';
import * as service from './notifications.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notifications, unreadCount, meta } = await service.list(
      req.tenantId!,
      req.user!.id,
      req,
    );
    sendSuccess(res, { notifications, unreadCount }, 200, meta);
  } catch (err) { next(err); }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await service.markRead(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, notification);
  } catch (err) { next(err); }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.markAllRead(req.tenantId!, req.user!.id);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};
