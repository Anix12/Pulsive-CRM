import { Request, Response, NextFunction } from 'express';
import * as service from './calls.service';
import * as session from './calls.session.service';
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

export const startSessionCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await session.startSessionCall(req.tenantId!, req.user!.id, req.body), 201);
  } catch (err) { next(err); }
};

export const pendingOutcome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await session.getPendingOutcome(req.tenantId!, req.user!.id));
  } catch (err) { next(err); }
};

export const recordOutcome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await session.recordOutcome(req.tenantId!, req.user!.id, req.params.id, req.body), 201);
  } catch (err) { next(err); }
};

// Dispose a lead with no call placed for it — the reason/remark/follow-up alone.
export const disposeLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactId, ...input } = req.body;
    sendSuccess(res, await session.disposeLead(req.tenantId!, req.user!.id, contactId, input), 201);
  } catch (err) { next(err); }
};

export const hangup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await session.hangup(req.tenantId!, req.user!.id, req.params.id);
    sendSuccess(res, { ended: true });
  } catch (err) { next(err); }
};

// Public TwiML endpoint - fetched by Twilio when the agent answers.
export const bridgeTwiml = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.type('text/xml').send(await session.bridgeTwiml(req.params.callId));
  } catch (err) { next(err); }
};
