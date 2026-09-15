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
import { parseDateRange, toPrismaDateFilter } from '@/utils/dateRange';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const {
    agentId, contactId, status, direction, campaignId, isAiInitiated,
    aiAgentId, outcome, listId, search, dateFrom, dateTo,
  } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (agentId) where.agentId = agentId;
  if (contactId) where.contactId = contactId;
  if (status) where.status = status;
  if (direction) where.direction = direction;
  if (campaignId) where.contact = { ...where.contact, campaignId };
  if (isAiInitiated !== undefined) where.isAiInitiated = isAiInitiated === 'true';
  if (aiAgentId) where.aiAgentId = aiAgentId;
  if (outcome === 'interested') where.aiSuccessEvaluation = true;
  else if (outcome === 'not_interested') where.aiSuccessEvaluation = false;
  else if (outcome === 'unknown') where.aiSuccessEvaluation = null;
  if (listId) where.contact = { ...where.contact, leadListMemberships: { some: { listId } } };
  if (search) {
    where.OR = [
      { contact: { name: { contains: search, mode: 'insensitive' } } },
      { toNumber: { contains: search } },
    ];
  }
  const createdAtFilter = toPrismaDateFilter(parseDateRange(dateFrom, dateTo));
  if (createdAtFilter) where.createdAt = createdAtFilter;

  const [
    calls, total, connected, interested, notInterested, unknownOutcome,
    durationAgg, costAgg, statusBreakdownRaw,
  ] = await Promise.all([
    prisma.call.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
        aiAgent: { select: { id: true, name: true } },
      },
    }),
    prisma.call.count({ where }),
    prisma.call.count({ where: { ...where, status: { in: ['IN_PROGRESS', 'COMPLETED'] } } }),
    prisma.call.count({ where: { ...where, aiSuccessEvaluation: true } }),
    prisma.call.count({ where: { ...where, aiSuccessEvaluation: false } }),
    prisma.call.count({ where: { ...where, aiSuccessEvaluation: null } }),
    prisma.call.aggregate({ where, _avg: { duration: true } }),
    prisma.call.aggregate({ where, _sum: { cost: true } }),
    prisma.call.groupBy({ by: ['status'], where, _count: { _all: true } }),
  ]);

  // Volume-over-time trend: respects the same filters (and date range, if one was
  // given) as the table above. With no date filter, defaults to a trailing 14-day
  // window — consistent with the app's other "no filter selected" trend defaults.
  const trendTo = createdAtFilter?.lte ? new Date(createdAtFilter.lte) : new Date();
  const trendFrom = createdAtFilter?.gte
    ? new Date(createdAtFilter.gte)
    : new Date(trendTo.getTime() - 13 * 86_400_000);
  const trendDays = Math.max(1, Math.min(90, Math.round((trendTo.getTime() - trendFrom.getTime()) / 86_400_000) + 1));

  const [trendCalls, durationRows] = await Promise.all([
    prisma.call.findMany({
      where: { ...where, createdAt: { gte: trendFrom, lte: trendTo } },
      select: { createdAt: true },
    }),
    prisma.call.findMany({ where: { ...where, duration: { not: null } }, select: { duration: true } }),
  ]);

  const volumeOverTime = Array.from({ length: trendDays }).map((_, i) => {
    const d = new Date(trendFrom);
    d.setDate(d.getDate() + i);
    const dayKey = d.toDateString();
    const count = trendCalls.filter((c) => c.createdAt.toDateString() === dayKey).length;
    return { date: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count };
  });

  const DURATION_BUCKETS = [
    { bucket: '<1 min', max: 60 },
    { bucket: '1-3 min', max: 180 },
    { bucket: '3-5 min', max: 300 },
    { bucket: '5-10 min', max: 600 },
    { bucket: '10+ min', max: Infinity },
  ];
  const durationDistribution = DURATION_BUCKETS.map((b) => ({ bucket: b.bucket, count: 0 }));
  for (const row of durationRows) {
    const idx = DURATION_BUCKETS.findIndex((b) => (row.duration ?? 0) <= b.max);
    durationDistribution[idx === -1 ? durationDistribution.length - 1 : idx].count += 1;
  }

  const stats = {
    totalCalls: total,
    connected,
    interested,
    notInterested,
    unknownOutcome,
    avgDuration: Math.round(durationAgg._avg.duration || 0),
    totalCost: costAgg._sum.cost || 0,
    byStatus: statusBreakdownRaw.map((s) => ({ status: s.status, count: s._count._all })),
    volumeOverTime,
    durationDistribution,
  };

  return { calls, meta: { ...paginationMeta(total, page, limit), stats } };
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
