import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { decrypt } from '@/utils/crypto';
import { VapiProvider } from '@/providers/calling/vapi';
import { emitToTenant } from '@/websocket';
import { SOCKET_EVENTS } from '@/config/constants';
import { env } from '@/config/env';
import { CreateAgentInput, UpdateAgentInput, InitiateAiCallInput } from './ai-calling.types';

interface EffectivePromptInput {
  systemPrompt: string;
  behavioralRules?: string | null;
  forbiddenTopics?: string | null;
  escalationRules?: string | null;
  pricingResponse?: string | null;
  notInterestedResponse?: string | null;
  knowledgeBase?: unknown;
  faqs?: unknown;
  closingMessage?: string | null;
}

const buildEffectiveSystemPrompt = (agent: EffectivePromptInput): string => {
  const sections: string[] = [agent.systemPrompt.trim()];

  if (agent.behavioralRules) sections.push(`Behavioral rules:\n${agent.behavioralRules}`);
  if (agent.forbiddenTopics) sections.push(`Never discuss the following topics:\n${agent.forbiddenTopics}`);
  if (agent.escalationRules) sections.push(`Escalate to a human when:\n${agent.escalationRules}`);
  if (agent.pricingResponse) sections.push(`If asked about pricing, respond with:\n${agent.pricingResponse}`);
  if (agent.notInterestedResponse) sections.push(`If the customer is not interested, respond with:\n${agent.notInterestedResponse}`);

  const knowledgeBase = agent.knowledgeBase as { topic: string; content: string }[] | null | undefined;
  if (knowledgeBase?.length) {
    const kb = knowledgeBase.map((k) => `- ${k.topic}: ${k.content}`).join('\n');
    sections.push(`Knowledge base:\n${kb}`);
  }

  const faqs = agent.faqs as { question: string; answer: string }[] | null | undefined;
  if (faqs?.length) {
    const faqText = faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n');
    sections.push(`Frequently asked questions:\n${faqText}`);
  }

  if (agent.closingMessage) sections.push(`When ending the call, say: "${agent.closingMessage}"`);

  return sections.join('\n\n');
};

const getVapiProvider = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.vapiApiKey || !tenant?.vapiPhoneNumberId) {
    throw new AppError(400, 'PROVIDER_NOT_CONFIGURED', 'Vapi is not configured. Please add your Vapi API key and phone number in Settings.');
  }
  return { provider: new VapiProvider(decrypt(tenant.vapiApiKey)), phoneNumberId: tenant.vapiPhoneNumberId };
};

export const listAgents = async (tenantId: string) => {
  const agents = await prisma.aiCallAgent.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  const stats = await prisma.call.groupBy({
    by: ['aiAgentId', 'status'],
    where: { tenantId, aiAgentId: { not: null } },
    _count: { _all: true },
  });

  const interestedCounts = await prisma.call.groupBy({
    by: ['aiAgentId'],
    where: { tenantId, aiAgentId: { not: null }, aiSuccessEvaluation: true },
    _count: { _all: true },
  });

  const connectedStatuses = new Set(['IN_PROGRESS', 'COMPLETED']);

  return agents.map((agent) => {
    const agentStats = stats.filter((s) => s.aiAgentId === agent.id);
    const totalCalls = agentStats.reduce((sum, s) => sum + s._count._all, 0);
    const connectedCalls = agentStats
      .filter((s) => connectedStatuses.has(s.status))
      .reduce((sum, s) => sum + s._count._all, 0);
    const interestedCalls = interestedCounts.find((s) => s.aiAgentId === agent.id)?._count._all ?? 0;

    return { ...agent, totalCalls, connectedCalls, interestedCalls };
  });
};

export const getById = async (tenantId: string, id: string) => {
  const agent = await prisma.aiCallAgent.findFirst({ where: { id, tenantId } });
  if (!agent) throw new AppError(404, 'NOT_FOUND', 'AI agent not found');
  return agent;
};

export const createAgent = async (tenantId: string, input: CreateAgentInput) => {
  const { provider } = await getVapiProvider(tenantId);

  const effectiveSystemPrompt = buildEffectiveSystemPrompt(input);

  const assistant = await provider.createAssistant({
    name: input.name,
    greeting: input.greeting,
    systemPrompt: effectiveSystemPrompt,
    voiceId: input.voiceId,
    serverUrl: `${env.API_URL}/api/v1/ai-calling/webhook/vapi`,
    maxDurationSeconds: input.maxCallDurationSec,
  });

  return prisma.aiCallAgent.create({
    data: {
      tenantId,
      name: input.name,
      language: input.language,
      category: input.category,
      description: input.description,
      callDirection: input.callDirection,
      greeting: input.greeting,
      systemPrompt: input.systemPrompt,
      voiceId: input.voiceId,
      vapiAssistantId: assistant.id,
      scriptSteps: input.scriptSteps,
      knowledgeBase: input.knowledgeBase,
      pricingResponse: input.pricingResponse,
      notInterestedResponse: input.notInterestedResponse,
      escalationRules: input.escalationRules,
      forbiddenTopics: input.forbiddenTopics,
      behavioralRules: input.behavioralRules,
      faqs: input.faqs,
      closingMessage: input.closingMessage,
      maxCallDurationSec: input.maxCallDurationSec,
      dailyCallLimit: input.dailyCallLimit,
      customHangupLogic: input.customHangupLogic,
    },
  });
};

export const updateAgent = async (tenantId: string, id: string, input: UpdateAgentInput) => {
  const agent = await getById(tenantId, id);

  const promptRelevantFields: (keyof UpdateAgentInput)[] = [
    'systemPrompt', 'behavioralRules', 'forbiddenTopics', 'escalationRules',
    'pricingResponse', 'notInterestedResponse', 'knowledgeBase', 'faqs', 'closingMessage',
  ];
  const touchesPrompt = promptRelevantFields.some((f) => input[f] !== undefined);

  if (agent.vapiAssistantId && (input.name || input.greeting || touchesPrompt || input.voiceId || input.maxCallDurationSec)) {
    const { provider } = await getVapiProvider(tenantId);
    await provider.updateAssistant(agent.vapiAssistantId, {
      name: input.name,
      greeting: input.greeting,
      systemPrompt: touchesPrompt ? buildEffectiveSystemPrompt({ ...agent, ...input }) : undefined,
      voiceId: input.voiceId,
      maxDurationSeconds: input.maxCallDurationSec,
    });
  }

  return prisma.aiCallAgent.update({
    where: { id },
    data: input as any,
  });
};

export const deleteAgent = async (tenantId: string, id: string) => {
  const agent = await getById(tenantId, id);

  if (agent.vapiAssistantId) {
    try {
      const { provider } = await getVapiProvider(tenantId);
      await provider.deleteAssistant(agent.vapiAssistantId);
    } catch {
      // best-effort — proceed with local delete even if Vapi cleanup fails
    }
  }

  await prisma.aiCallAgent.delete({ where: { id } });
};

export const initiateAiCall = async (tenantId: string, agentId: string, input: InitiateAiCallInput) => {
  const agent = await getById(tenantId, agentId);
  if (!agent.vapiAssistantId) throw new AppError(400, 'AGENT_NOT_READY', 'This agent has no Vapi assistant configured');

  const { provider, phoneNumberId } = await getVapiProvider(tenantId);

  const call = await prisma.call.create({
    data: {
      tenantId,
      aiAgentId: agentId,
      contactId: input.contactId,
      direction: 'OUTBOUND',
      status: 'INITIATED',
      provider: 'vapi',
      isAiInitiated: true,
      fromNumber: phoneNumberId,
      toNumber: input.toNumber,
    },
  });

  const result = await provider.startCall({
    assistantId: agent.vapiAssistantId,
    phoneNumberId,
    customerNumber: input.toNumber,
  });

  const updatedCall = await prisma.call.update({
    where: { id: call.id },
    data: { providerCallSid: result.id, status: 'RINGING', startedAt: new Date() },
  });

  emitToTenant(tenantId, SOCKET_EVENTS.CALL_STATUS_UPDATE, { callId: call.id, status: 'RINGING' });

  await prisma.onboardingProgress.updateMany({
    where: { tenantId, madeFirstCall: false },
    data: { madeFirstCall: true },
  });

  return updatedCall;
};

const VAPI_STATUS_MAP: Record<string, string> = {
  queued: 'INITIATED',
  ringing: 'RINGING',
  'in-progress': 'IN_PROGRESS',
  forwarding: 'IN_PROGRESS',
  ended: 'COMPLETED',
};

export const handleVapiWebhook = async (payload: any) => {
  const message = payload?.message;
  if (!message) return;

  const vapiCall = message.call;
  if (!vapiCall?.id) return;

  const call = await prisma.call.findUnique({ where: { providerCallSid: vapiCall.id } });
  if (!call) return;

  const data: any = {};

  if (message.type === 'status-update' && message.status) {
    data.status = VAPI_STATUS_MAP[message.status] || call.status;
  }

  if (message.type === 'end-of-call-report') {
    data.status = message.endedReason === 'assistant-error' ? 'FAILED' : 'COMPLETED';
    data.endedAt = new Date();
    if (message.durationSeconds) data.duration = Math.round(message.durationSeconds);
    if (message.recordingUrl) data.recordingUrl = message.recordingUrl;
    if (message.transcript) data.transcription = message.transcript;
    if (typeof message.cost === 'number') data.cost = message.cost;
    if (message.analysis?.summary) data.aiSummary = message.analysis.summary;
    if (typeof message.analysis?.successEvaluation === 'boolean') {
      data.aiSuccessEvaluation = message.analysis.successEvaluation;
    } else if (typeof message.analysis?.successEvaluation === 'string') {
      data.aiSuccessEvaluation = message.analysis.successEvaluation.toLowerCase() === 'true';
    }
  }

  if (Object.keys(data).length === 0) return;

  await prisma.call.update({ where: { id: call.id }, data });

  emitToTenant(call.tenantId, SOCKET_EVENTS.CALL_STATUS_UPDATE, {
    callId: call.id,
    status: data.status || call.status,
    duration: data.duration,
  });
};
