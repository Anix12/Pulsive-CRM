import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { decrypt } from '@/utils/crypto';
import { getCallingProvider } from '@/providers/calling';
import { emitToTenant } from '@/websocket';
import { SOCKET_EVENTS } from '@/config/constants';
import { Request } from 'express';
import { InitiateCallInput } from './calls.types';
import { env } from '@/config/env';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { agentId, contactId, status, direction, campaignId } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (agentId) where.agentId = agentId;
  if (contactId) where.contactId = contactId;
  if (status) where.status = status;
  if (direction) where.direction = direction;
  if (campaignId) where.contact = { campaignId };

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.call.count({ where }),
  ]);

  return { calls, meta: paginationMeta(total, page, limit) };
};

export const getById = async (tenantId: string, id: string) => {
  const call = await prisma.call.findFirst({
    where: { id, tenantId },
    include: {
      contact: true,
      agent: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!call) throw new AppError(404, 'NOT_FOUND', 'Call not found');
  return call;
};

export const initiateCall = async (tenantId: string, agentId: string, input: InitiateCallInput) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.twilioAccountSid || !tenant?.twilioAuthToken || !tenant?.twilioPhoneNumber) {
    throw new AppError(400, 'PROVIDER_NOT_CONFIGURED', 'Twilio is not configured. Please add your Twilio credentials in Settings.');
  }

  const contact = await prisma.contact.findFirst({ where: { id: input.contactId, tenantId } });
  if (!contact) throw new AppError(404, 'NOT_FOUND', 'Contact not found');

  const call = await prisma.call.create({
    data: {
      tenantId,
      agentId,
      contactId: input.contactId,
      direction: 'OUTBOUND',
      status: 'INITIATED',
      fromNumber: tenant.twilioPhoneNumber,
      toNumber: input.toNumber,
      notes: input.notes,
    },
  });

  const provider = getCallingProvider({
    provider: 'twilio',
    accountSid: tenant.twilioAccountSid,
    authToken: tenant.twilioAuthToken,
    phoneNumber: tenant.twilioPhoneNumber,
  });

  const result = await provider.initiateCall({
    to: input.toNumber,
    from: tenant.twilioPhoneNumber,
    statusCallbackUrl: `${env.API_URL}/api/v1/calls/webhook/twilio`,
    recordingEnabled: input.recordingEnabled,
  });

  const updatedCall = await prisma.call.update({
    where: { id: call.id },
    data: { providerCallSid: result.providerCallSid, status: 'RINGING', startedAt: new Date() },
  });

  emitToTenant(tenantId, SOCKET_EVENTS.CALL_STATUS_UPDATE, { callId: call.id, status: 'RINGING' });

  await prisma.onboardingProgress.updateMany({
    where: { tenantId, madeFirstCall: false },
    data: { madeFirstCall: true },
  });

  return updatedCall;
};

export const handleTwilioWebhook = async (payload: Record<string, string>) => {
  const call = await prisma.call.findUnique({ where: { providerCallSid: payload.CallSid } });
  if (!call) return;

  const statusMap: Record<string, string> = {
    initiated: 'INITIATED',
    ringing: 'RINGING',
    'in-progress': 'IN_PROGRESS',
    completed: 'COMPLETED',
    failed: 'FAILED',
    busy: 'BUSY',
    'no-answer': 'NO_ANSWER',
    canceled: 'CANCELLED',
  };

  const status = statusMap[payload.CallStatus] || 'FAILED';
  const data: any = { status };

  if (payload.CallDuration) data.duration = parseInt(payload.CallDuration);
  if (payload.RecordingSid) data.recordingSid = payload.RecordingSid;
  if (payload.RecordingUrl) data.recordingUrl = payload.RecordingUrl;
  if (status === 'COMPLETED') data.endedAt = new Date();

  await prisma.call.update({ where: { id: call.id }, data });

  emitToTenant(call.tenantId, SOCKET_EVENTS.CALL_STATUS_UPDATE, {
    callId: call.id,
    status,
    duration: data.duration,
  });
};
