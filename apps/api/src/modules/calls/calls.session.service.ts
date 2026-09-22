import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getCallingProvider } from '@/providers/calling';
import { emitToTenant } from '@/websocket';
import { SOCKET_EVENTS } from '@/config/constants';
import { env } from '@/config/env';

// Lead View calling sessions: manual dial, the agent's mobile rings first, then the
// answered leg is bridged to the lead. Kept apart from calls.service (direct dialer).

const escapeXml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const providerFor = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.twilioAccountSid || !tenant?.twilioAuthToken || !tenant?.twilioPhoneNumber) {
    throw new AppError(400, 'PROVIDER_NOT_CONFIGURED', 'Twilio is not configured. Please add your Twilio credentials in Settings.');
  }
  return {
    fromNumber: tenant.twilioPhoneNumber,
    provider: getCallingProvider({
      provider: 'twilio',
      accountSid: tenant.twilioAccountSid,
      authToken: tenant.twilioAuthToken,
      phoneNumber: tenant.twilioPhoneNumber,
    }),
  };
};

// A session call the agent has not disposed yet, if any. Disposing is never required
// before the next call — the agent can dispose it whenever they want, from any tab that
// still shows it (Dispose lead stays unlocked, it just does not block dialling).
export const getPendingOutcome = (tenantId: string, agentId: string) =>
  prisma.call.findFirst({
    where: { tenantId, agentId, isSessionCall: true, outcome: { is: null } },
    orderBy: { createdAt: 'desc' },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });

export const startSessionCall = async (
  tenantId: string,
  agentId: string,
  input: { contactId: string; agentPhone?: string },
) => {
  const { provider, fromNumber } = await providerFor(tenantId);

  const agent = await prisma.user.findFirst({ where: { id: agentId, tenantId } });
  if (!agent) throw new AppError(404, 'NOT_FOUND', 'Agent not found');
  const agentPhone = input.agentPhone || agent.phone;
  if (!agentPhone) {
    throw new AppError(400, 'AGENT_PHONE_REQUIRED', 'Add your mobile number so we can ring it before connecting the lead.');
  }
  if (input.agentPhone && input.agentPhone !== agent.phone) {
    await prisma.user.update({ where: { id: agentId }, data: { phone: input.agentPhone } });
  }

  const contact = await prisma.contact.findFirst({ where: { id: input.contactId, tenantId } });
  if (!contact) throw new AppError(404, 'NOT_FOUND', 'Contact not found');

  const call = await prisma.call.create({
    data: {
      tenantId,
      agentId,
      contactId: contact.id,
      direction: 'OUTBOUND',
      status: 'INITIATED',
      fromNumber,
      toNumber: contact.phone,
      isSessionCall: true,
    },
  });

  try {
    const result = await provider.initiateCall({
      to: agentPhone,
      from: fromNumber,
      statusCallbackUrl: `${env.API_URL}/api/v1/calls/webhook/twilio`,
      twimlUrl: `${env.API_URL}/api/v1/calls/twiml/bridge/${call.id}`,
    });
    const updated = await prisma.call.update({
      where: { id: call.id },
      data: { providerCallSid: result.providerCallSid, status: 'RINGING', startedAt: new Date() },
    });
    emitToTenant(tenantId, SOCKET_EVENTS.CALL_STATUS_UPDATE, { callId: call.id, status: 'RINGING' });
    return updated;
  } catch (err) {
    // The agent still has to dispose this attempt, so the row is kept as FAILED.
    await prisma.call.update({ where: { id: call.id }, data: { status: 'FAILED' } });
    throw err;
  }
};

// Public: fetched by Twilio once the agent picks up. Only the stored lead number is dialled.
export const bridgeTwiml = async (callId: string) => {
  const call = await prisma.call.findUnique({ where: { id: callId }, include: { contact: { select: { name: true } } } });
  if (!call || !call.isSessionCall) return '<Response><Say>Call not found.</Say><Hangup/></Response>';
  const callback = escapeXml(`${env.API_URL}/api/v1/calls/webhook/twilio`);
  return (
    '<Response>' +
    `<Say>Connecting you to ${escapeXml(call.contact?.name || 'the lead')}.</Say>` +
    `<Dial callerId="${escapeXml(call.fromNumber)}" answerOnBridge="true">` +
    `<Number statusCallback="${callback}" statusCallbackEvent="answered completed">${escapeXml(call.toNumber)}</Number>` +
    '</Dial></Response>'
  );
};

export const hangup = async (tenantId: string, agentId: string, callId: string) => {
  const call = await prisma.call.findFirst({ where: { id: callId, tenantId, agentId } });
  if (!call) throw new AppError(404, 'NOT_FOUND', 'Call not found');
  if (call.providerCallSid) {
    const { provider } = await providerFor(tenantId);
    await provider.endCall(call.providerCallSid);
  }
  return call;
};

type OutcomeInput = {
  connected: boolean;
  reason?: string;
  remark?: string;
  followUpAt?: string;
  stage?: string;
  engagementFormId?: string;
  answers?: Record<string, string | null>;
};

const writeOutcome = async (
  tenantId: string,
  agentId: string,
  call: { id: string; contactId: string | null; duration: number | null; contact: { name: string } | null },
  input: OutcomeInput,
) => {
  const followUpAt = input.followUpAt ? new Date(input.followUpAt) : undefined;
  const contactId = call.contactId!;
  const callId = call.id;

  return prisma.$transaction(async (tx) => {
    const outcome = await tx.callOutcome.create({
      data: {
        tenantId,
        callId,
        contactId,
        agentId,
        connected: input.connected,
        reason: input.connected ? undefined : input.reason,
        remark: input.remark,
        followUpAt,
        stage: input.connected ? input.stage : undefined,
        engagementFormId: input.connected ? input.engagementFormId : undefined,
        answers: input.connected && input.answers ? (input.answers as any) : undefined,
      },
    });
    if (followUpAt) {
      await tx.task.create({
        data: {
          tenantId,
          contactId,
          title: `Follow up with ${call.contact?.name ?? 'lead'}`,
          description: input.remark,
          assignedToId: agentId,
          dueDate: followUpAt,
        },
      });
    }
    await tx.activity.create({
      data: {
        tenantId,
        contactId,
        userId: agentId,
        type: 'CALL',
        subject: input.connected ? 'Call connected' : `Call not connected: ${input.reason}`,
        body: input.remark,
        metadata: { callId, duration: call.duration ?? null },
      },
    });
    return outcome;
  });
};

export const recordOutcome = async (tenantId: string, agentId: string, callId: string, input: OutcomeInput) => {
  const call = await prisma.call.findFirst({
    where: { id: callId, tenantId, agentId, isSessionCall: true },
    include: { contact: { select: { id: true, name: true } } },
  });
  if (!call || !call.contactId) throw new AppError(404, 'NOT_FOUND', 'Call not found');
  if (call.status === 'RINGING' || call.status === 'IN_PROGRESS') {
    throw new AppError(409, 'CALL_IN_PROGRESS', 'End the call before disposing the lead');
  }
  const existing = await prisma.callOutcome.findUnique({ where: { callId } });
  if (existing) throw new AppError(409, 'ALREADY_DISPOSED', 'This call has already been disposed');

  return writeOutcome(tenantId, agentId, call, input);
};

// Dispose a lead directly, with no call ever placed. Reuses an already-ringing/undisposed
// session call for this contact if one exists (so it doesn't leave a stray duplicate);
// otherwise records a zero-duration placeholder call so the outcome still has something
// to attach to, matching the shape every other disposition uses.
export const disposeLead = async (tenantId: string, agentId: string, contactId: string, input: OutcomeInput) => {
  const existingCall = await prisma.call.findFirst({
    where: { tenantId, agentId, contactId, isSessionCall: true, outcome: { is: null } },
    orderBy: { createdAt: 'desc' },
    include: { contact: { select: { id: true, name: true } } },
  });
  if (existingCall) {
    if (existingCall.status === 'RINGING' || existingCall.status === 'IN_PROGRESS') {
      throw new AppError(409, 'CALL_IN_PROGRESS', 'End the call before disposing the lead');
    }
    return writeOutcome(tenantId, agentId, existingCall, input);
  }

  const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId }, select: { id: true, name: true, phone: true } });
  if (!contact) throw new AppError(404, 'NOT_FOUND', 'Contact not found');

  const now = new Date();
  const call = await prisma.call.create({
    data: {
      tenantId,
      agentId,
      contactId: contact.id,
      direction: 'OUTBOUND',
      status: input.connected ? 'COMPLETED' : 'NO_ANSWER',
      fromNumber: 'manual',
      toNumber: contact.phone,
      isSessionCall: true,
      startedAt: now,
      endedAt: now,
      duration: 0,
    },
    include: { contact: { select: { id: true, name: true } } },
  });
  return writeOutcome(tenantId, agentId, call, input);
};

// Twilio events for the lead's leg carry the agent leg's sid as ParentCallSid.
export const handleLeadLegEvent = async (payload: Record<string, string>) => {
  const call = await prisma.call.findUnique({ where: { providerCallSid: payload.ParentCallSid } });
  if (!call) return;

  if (payload.CallStatus === 'in-progress') {
    const answeredAt = new Date();
    await prisma.call.update({ where: { id: call.id }, data: { answeredAt } });
    emitToTenant(call.tenantId, SOCKET_EVENTS.CALL_STATUS_UPDATE, { callId: call.id, status: 'IN_PROGRESS', answeredAt });
    return;
  }

  const failed: Record<string, 'BUSY' | 'NO_ANSWER' | 'FAILED' | 'CANCELLED'> = {
    busy: 'BUSY',
    'no-answer': 'NO_ANSWER',
    failed: 'FAILED',
    canceled: 'CANCELLED',
  };
  const status = failed[payload.CallStatus];
  if (status) {
    await prisma.call.update({ where: { id: call.id }, data: { status, endedAt: new Date() } });
    emitToTenant(call.tenantId, SOCKET_EVENTS.CALL_STATUS_UPDATE, { callId: call.id, status });
  }
};
