import { Request, Response } from 'express';
import * as service from './integrations.service';
import { sendSuccess, sendError } from '@/utils/response';

export const list = async (req: Request, res: Response) => {
  const integrations = await service.list(req.tenantId!);
  sendSuccess(res, integrations);
};

export const save = async (req: Request, res: Response) => {
  const { type } = req.params;
  if (!service.INTEGRATION_TYPES.includes(type as any)) {
    return sendError(res, 400, 'INVALID_TYPE', 'Unknown integration type');
  }
  const integration = await service.upsert(req.tenantId!, type, req.body);
  sendSuccess(res, integration);
};

export const disconnect = async (req: Request, res: Response) => {
  const { type } = req.params;
  await service.disconnect(req.tenantId!, type);
  sendSuccess(res, { message: 'Integration disconnected' });
};
