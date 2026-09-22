import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/db/client';
import { env } from '@/config/env';
import { AppError } from '@/middleware/errorHandler';

export type TranscriptTurn = { who: 'me' | 'them'; text: string };

const requireAnthropic = () => {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError(
      400,
      'AI_NOT_CONFIGURED',
      'AI Coach is not configured for this workspace. Set ANTHROPIC_API_KEY to enable it.',
    );
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
};

/** Parses a JSON object out of a Claude text response, tolerating stray prose/fences. */
const parseJsonResponse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return fallback;
  }
};

const transcriptToText = (transcript: TranscriptTurn[]) =>
  transcript.map((t) => `${t.who === 'me' ? 'Agent' : 'Customer'}: ${t.text}`).join('\n');

const DISPOSITION_CATEGORY_COLOR: Record<string, string> = {
  Connected: '#16A34A',
  'Follow Up': '#7C3AED',
  'Not Connected': '#DC2626',
  Unclassified: '#9795AC',
};

const mapLiveCall = (c: {
  id: string; startedAt: Date | null; toNumber: string; isAiInitiated: boolean;
  contact: { id: string; name: string; phone: string } | null;
  agent: { id: string; firstName: string; lastName: string } | null;
  disposition: { name: string; category: string } | null;
}) => ({
  id: c.id,
  contactId: c.contact?.id ?? null,
  agentId: c.agent?.id ?? null,
  agent: c.agent ? `${c.agent.firstName} ${c.agent.lastName}`.trim() : 'Unassigned',
  lead: c.contact?.name ?? c.toNumber,
  phone: c.contact?.phone ?? c.toNumber,
  startedAt: c.startedAt,
  disposition: c.disposition?.name ?? null,
  isAiInitiated: c.isAiInitiated,
});

const mapActivity = (a: {
  id: string; type: string; subject: string; body: string | null; occurredAt: Date;
  contact: { id: string; name: string } | null;
  user: { firstName: string; lastName: string };
}) => ({
  id: a.id,
  type: a.type,
  subject: a.subject,
  body: a.body,
  occurredAt: a.occurredAt,
  contactId: a.contact?.id ?? null,
  contactName: a.contact?.name ?? null,
  userName: `${a.user.firstName} ${a.user.lastName}`.trim(),
});

export const getLiveCalls = async (tenantId: string, limit?: number) => {
  const rows = await prisma.call.findMany({
    where: { tenantId, status: 'IN_PROGRESS' },
    ...(limit ? { take: limit } : {}),
    orderBy: { startedAt: 'desc' },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      agent: { select: { id: true, firstName: true, lastName: true } },
      disposition: { select: { name: true, category: true } },
    },
  });
  return rows.map(mapLiveCall);
};

export const getActivityFeed = async (tenantId: string, limit = 50) => {
  const rows = await prisma.activity.findMany({
    where: { tenantId },
    orderBy: { occurredAt: 'desc' },
    take: limit,
    include: {
      contact: { select: { id: true, name: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  return rows.map(mapActivity);
};

export const overview = async (tenantId: string) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);
  const todayRange = { gte: startOfToday, lt: endOfToday };

  const [
    activeCalls,
    liveCallRows,
    contactedTodayGroups,
    qualifiedToday,
    convertedDeals,
    lostDeals,
    revenueAgg,
    agents,
    todaysCalls,
    activityRows,
  ] = await Promise.all([
    prisma.call.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
    prisma.call.findMany({
      where: { tenantId, status: 'IN_PROGRESS' },
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
        disposition: { select: { name: true, category: true } },
      },
    }),
    prisma.call.groupBy({ by: ['contactId'], where: { tenantId, contactId: { not: null }, createdAt: todayRange } }),
    prisma.contact.count({ where: { tenantId, status: 'PROSPECT', updatedAt: todayRange } }),
    prisma.deal.count({ where: { tenantId, isWon: true, closedAt: todayRange } }),
    prisma.deal.count({ where: { tenantId, isWon: false, closedAt: todayRange } }),
    prisma.deal.aggregate({ where: { tenantId, isWon: true, closedAt: todayRange }, _sum: { value: true } }),
    prisma.user.findMany({ where: { tenantId, role: { in: ['AGENT', 'MANAGER'] }, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true } }),
    prisma.call.findMany({ where: { tenantId, createdAt: todayRange }, include: { disposition: { select: { name: true, category: true } } } }),
    prisma.activity.findMany({
      where: { tenantId },
      orderBy: { occurredAt: 'desc' },
      take: 10,
      include: {
        contact: { select: { id: true, name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  // Live Calls Monitor
  const liveCalls = liveCallRows.map(mapLiveCall);

  // Team performance (today)
  const teamPerformance = await Promise.all(
    agents.map(async (a) => {
      const [calls, qualified, converted] = await Promise.all([
        prisma.call.count({ where: { tenantId, agentId: a.id, createdAt: todayRange } }),
        prisma.contact.count({ where: { tenantId, assignedToId: a.id, status: 'PROSPECT', updatedAt: todayRange } }),
        prisma.deal.count({ where: { tenantId, assignedToId: a.id, isWon: true, closedAt: todayRange } }),
      ]);
      return {
        agentId: a.id,
        name: `${a.firstName} ${a.lastName}`.trim(),
        calls,
        qualified,
        converted,
        rate: calls > 0 ? Math.round((converted / calls) * 1000) / 10 : 0,
      };
    }),
  );

  // Call outcomes (today, by disposition)
  const byDisposition: Record<string, { category: string; count: number }> = {};
  let noDisposition = 0;
  for (const c of todaysCalls) {
    if (!c.disposition) { noDisposition++; continue; }
    const key = c.disposition.name;
    if (!byDisposition[key]) byDisposition[key] = { category: c.disposition.category, count: 0 };
    byDisposition[key].count++;
  }
  const callOutcomes = Object.entries(byDisposition)
    .map(([name, d]) => ({ label: name, count: d.count, category: d.category, color: DISPOSITION_CATEGORY_COLOR[d.category] ?? DISPOSITION_CATEGORY_COLOR.Unclassified }))
    .sort((a, b) => b.count - a.count);
  if (noDisposition > 0) {
    callOutcomes.push({ label: 'No Disposition', count: noDisposition, category: 'Unclassified', color: DISPOSITION_CATEGORY_COLOR.Unclassified });
  }

  const revenueToday = Number(revenueAgg._sum.value ?? 0);

  return {
    kpis: {
      activeCalls,
      leadsContactedToday: contactedTodayGroups.length,
      qualifiedLeadsToday: qualifiedToday,
      convertedToday: convertedDeals,
      lostToday: lostDeals,
      revenueToday,
    },
    liveCalls,
    activityFeed: activityRows.map(mapActivity),
    teamPerformance,
    callOutcomes,
    totalCallsToday: todaysCalls.length,
  };
};

// ─── Agent-facing AI Coach (used by the AGENT-role user dashboard) ────────────

/** Leads assigned to this agent, for the AI Coach lead picker. */
export const getMyLeads = async (tenantId: string, userId: string) => {
  const rows = await prisma.contact.findMany({
    where: { tenantId, assignedToId: userId },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    take: 50,
    select: { id: true, name: true, company: true, phone: true, score: true, status: true, source: true, jobTitle: true },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company ?? '—',
    phone: c.phone,
    score: c.score,
    stage: c.status,
    source: c.source ?? 'Unknown',
    title: c.jobTitle ?? undefined,
  }));
};

const coachSystemPrompt =
  'You are a live sales-call coach whispering guidance to a CRM sales agent while they are on a call. ' +
  'You will be given the lead\'s CRM context and the call transcript so far. ' +
  'Respond with ONLY valid JSON in the exact shape ' +
  '{"objectionDetected": boolean, "sentiment": "Positive"|"Neutral"|"Negative", ' +
  '"suggestedReply": "...", "alternativeReply": "...", "nextBestAction": "...", "conversionProbability": number} ' +
  '— no markdown fences, no other text. suggestedReply and alternativeReply are two different ways the agent ' +
  'could respond right now to the customer\'s last message, written in first person as something the agent would ' +
  'say out loud. conversionProbability is 0-100, your estimate of the odds this lead converts based on the ' +
  'conversation so far.';

export const coachReply = async (
  tenantId: string,
  userId: string,
  input: { leadId: string; transcript: TranscriptTurn[] },
) => {
  const anthropic = requireAnthropic();
  const lead = await prisma.contact.findFirst({
    where: { id: input.leadId, tenantId, assignedToId: userId },
    select: { name: true, company: true, status: true, score: true, source: true },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system: coachSystemPrompt,
    messages: [
      {
        role: 'user',
        content:
          `Lead: ${lead.name}, company: ${lead.company ?? 'unknown'}, CRM stage: ${lead.status}, ` +
          `lead score: ${lead.score}, source: ${lead.source ?? 'unknown'}.\n\nTranscript so far:\n` +
          transcriptToText(input.transcript),
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
  return parseJsonResponse(raw, {
    objectionDetected: false,
    sentiment: 'Neutral' as const,
    suggestedReply: raw || 'Could not generate a suggestion. Please try again.',
    alternativeReply: '',
    nextBestAction: '',
    conversionProbability: 50,
  });
};

const summarySystemPrompt =
  'You are summarizing a completed sales call for a CRM. Respond with ONLY valid JSON in the exact shape ' +
  '{"summary": "...", "disposition": "...", "followUpNeeded": boolean, "followUpNote": "..."} — no markdown ' +
  'fences, no other text. disposition must be one of: "Connected — Interested", "Connected — Not Interested", ' +
  '"Callback Requested", "Voicemail", "No Answer", "Busy". summary is 2-4 sentences. followUpNote is empty ' +
  'string if followUpNeeded is false.';

export const callSummary = async (
  tenantId: string,
  userId: string,
  input: { leadId: string; transcript: TranscriptTurn[] },
) => {
  const anthropic = requireAnthropic();
  const lead = await prisma.contact.findFirst({
    where: { id: input.leadId, tenantId, assignedToId: userId },
    select: { name: true, company: true },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 512,
    system: summarySystemPrompt,
    messages: [
      { role: 'user', content: `Lead: ${lead.name} (${lead.company ?? 'unknown company'}).\n\nTranscript:\n${transcriptToText(input.transcript)}` },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
  return parseJsonResponse(raw, {
    summary: raw || 'Could not generate a summary.',
    disposition: 'Connected — Interested',
    followUpNeeded: false,
    followUpNote: '',
  });
};

export const kbAsk = async (tenantId: string, userId: string, input: { question: string; leadId?: string }) => {
  const anthropic = requireAnthropic();
  let leadContext = '';
  if (input.leadId) {
    const lead = await prisma.contact.findFirst({
      where: { id: input.leadId, tenantId, assignedToId: userId },
      select: { name: true, company: true, status: true, score: true },
    });
    if (lead) leadContext = `Current lead: ${lead.name} (${lead.company ?? 'unknown'}), stage ${lead.status}, score ${lead.score}.\n\n`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 512,
    system:
      'You are a CRM sales knowledge-base assistant helping a sales agent answer product, pricing, and process ' +
      'questions during or around a call. Answer concisely and practically, in plain text (no markdown), under ' +
      '120 words.',
    messages: [{ role: 'user', content: `${leadContext}Question: ${input.question}` }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const answer = textBlock && 'text' in textBlock ? textBlock.text : '';
  return { answer: answer || 'Could not generate an answer. Please try again.' };
};

const DISPOSITION_TO_CONTACT_STATUS: Record<string, 'PROSPECT' | undefined> = {
  'Connected — Interested': 'PROSPECT',
};

/** Persists the outcome of an AI-coached call: a Call record, an Activity, and an optional follow-up Task. */
export const finishCoachedCall = async (
  tenantId: string,
  userId: string,
  input: {
    leadId: string;
    transcript: TranscriptTurn[];
    durationSeconds: number;
    disposition: string;
    summary: string;
    conversionProbability?: number;
    followUpNote?: string;
  },
) => {
  const lead = await prisma.contact.findFirst({ where: { id: input.leadId, tenantId, assignedToId: userId } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found');

  const now = new Date();
  const startedAt = new Date(now.getTime() - input.durationSeconds * 1000);

  const call = await prisma.call.create({
    data: {
      tenantId,
      contactId: lead.id,
      agentId: userId,
      provider: 'ai-coach',
      direction: 'OUTBOUND',
      status: 'COMPLETED',
      fromNumber: 'ai-coach',
      toNumber: lead.phone,
      startedAt,
      endedAt: now,
      duration: input.durationSeconds,
      transcription: transcriptToText(input.transcript),
      notes: input.disposition,
      aiSummary: input.summary,
      aiSuccessEvaluation: input.disposition.startsWith('Connected'),
      isAiInitiated: true,
    },
  });

  await prisma.activity.create({
    data: {
      tenantId,
      contactId: lead.id,
      userId,
      type: 'CALL',
      subject: `AI-coached call — ${input.disposition}`,
      body: input.summary,
      occurredAt: now,
    },
  });

  const nextStatus = DISPOSITION_TO_CONTACT_STATUS[input.disposition];
  if (nextStatus) {
    await prisma.contact.update({ where: { id: lead.id }, data: { status: nextStatus } });
  }

  let task = null;
  if (input.followUpNote) {
    const dueDate = new Date(now.getTime() + 2 * 86400000);
    task = await prisma.task.create({
      data: {
        tenantId,
        contactId: lead.id,
        title: `Follow up: ${lead.name}`,
        description: input.followUpNote,
        assignedToId: userId,
        dueDate,
      },
    });
  }

  return { call, task };
};
