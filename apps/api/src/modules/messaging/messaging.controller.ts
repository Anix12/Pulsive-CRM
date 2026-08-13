import { Request, Response, NextFunction } from 'express';
import * as service from './messaging.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, messages, 200, meta);
  } catch (err) { next(err); }
};

export const send = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.send(req.tenantId!, req.user!.id, req.body), 201);
  } catch (err) { next(err); }
};

export const inboundWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = req.params.provider;
    const channel = req.query.channel as 'SMS' | 'WHATSAPP' || 'SMS';
    await service.handleInboundWebhook(provider, channel, req.body);
    res.status(200).send('OK');
  } catch (err) { next(err); }
};

export const listTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.listTemplates(req.tenantId!));
  } catch (err) { next(err); }
};

export const createTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.createTemplate(req.tenantId!, req.body), 201);
  } catch (err) { next(err); }
};

export const updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.updateTemplate(req.tenantId!, req.params.id, req.body));
  } catch (err) { next(err); }
};

export const deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteTemplate(req.tenantId!, req.params.id);
    sendSuccess(res, { message: 'Template deleted' });
  } catch (err) { next(err); }
};

export const aiDraftEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.aiDraftEmail(req.body));
  } catch (err) { next(err); }
};

export const getEmailConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getEmailConfig(req.tenantId!));
  } catch (err) { next(err); }
};

export const updateEmailConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.upsertEmailConfig(req.tenantId!, req.body));
  } catch (err) { next(err); }
};
