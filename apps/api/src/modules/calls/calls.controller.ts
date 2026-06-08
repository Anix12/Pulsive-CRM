import { Request, Response, NextFunction } from 'express';
import * as service from './calls.service';
import { sendSuccess } from '@/utils/response';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { calls, meta } = await service.list(req.tenantId!, req);
    sendSuccess(res, calls, 200, meta);
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getById(req.tenantId!, req.params.id));
  } catch (err) { next(err); }
};

export const initiateCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.initiateCall(req.tenantId!, req.user!.id, req.body), 201);
  } catch (err) { next(err); }
};

// Public webhook endpoint — called by Twilio
export const twilioWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.handleTwilioWebhook(req.body);
    res.status(200).send('<Response/>'); // TwiML OK response
  } catch (err) { next(err); }
};
