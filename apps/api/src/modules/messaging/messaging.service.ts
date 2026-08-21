import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { getSmsProvider, getWhatsAppProvider } from '@/providers/messaging';
import { emitToTenant } from '@/websocket';
import { SOCKET_EVENTS } from '@/config/constants';
import { env } from '@/config/env';
import { Request } from 'express';
import { SendMessageInput, CreateTemplateInput, AiDraftEmailInput, EmailConfigInput } from './messaging.types';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { channel, contactId, status, agentId } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (channel) where.channel = channel;
  if (contactId) where.contactId = contactId;
  if (status) where.status = status;
  if (agentId) where.agentId = agentId;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { contact: { select: { id: true, name: true } } },
    }),
    prisma.message.count({ where }),
  ]);

  return { messages, meta: paginationMeta(total, page, limit) };
};

export const send = async (tenantId: string, agentId: string, input: SendMessageInput) => {
  const [tenant, contact] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.contact.findFirst({ where: { id: input.contactId, tenantId } }),
  ]);

  if (!contact) throw new AppError(404, 'NOT_FOUND', 'Contact not found');

  const toNumber = input.channel === 'WHATSAPP' ? (contact.whatsapp || contact.phone) : contact.phone;
  let fromNumber = '';

  const providerConfig = {
    twilioAccountSid: tenant?.twilioAccountSid || undefined,
    twilioAuthToken: tenant?.twilioAuthToken || undefined,
    whatsappAccessToken: tenant?.whatsappAccessToken || undefined,
    whatsappPhoneNumberId: tenant?.whatsappPhoneNumberId || undefined,
  };

  const message = await prisma.message.create({
    data: {
      tenantId,
      contactId: input.contactId,
      agentId,
      templateId: input.templateId,
      channel: input.channel,
      provider: input.channel === 'SMS' ? 'twilio' : 'meta',
      direction: 'OUTBOUND',
      status: 'PENDING',
      fromNumber: '',
      toNumber,
      body: input.body,
      mediaUrl: input.mediaUrl,
    },
  });

  try {
    const provider =
      input.channel === 'SMS'
        ? getSmsProvider(providerConfig)
        : getWhatsAppProvider(providerConfig);

    const result = await provider.send({ to: toNumber, from: fromNumber, body: input.body, mediaUrl: input.mediaUrl });

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        providerMessageId: result.providerMessageId,
      },
    });

    await prisma.onboardingProgress.updateMany({
      where: { tenantId, sentFirstMessage: false },
      data: { sentFirstMessage: true },
    });

    emitToTenant(tenantId, SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, { messageId: message.id, status: 'SENT' });
  } catch (err) {
    await prisma.message.update({
      where: { id: message.id },
      data: { status: 'FAILED', failedAt: new Date(), failureReason: (err as Error).message },
    });
    throw err;
  }

  return prisma.message.findUnique({ where: { id: message.id } });
};

export const handleInboundWebhook = async (
  provider: string,
  channel: 'SMS' | 'WHATSAPP',
  payload: Record<string, string>,
) => {
  // Normalize payload for different providers
  const from = payload.From || payload.from || '';
  const body = payload.Body || payload.body || '';
  const providerMessageId = payload.MessageSid || payload.id || '';

  const contact = await prisma.contact.findFirst({
    where: { phone: from },
    select: { id: true, tenantId: true },
  });

  if (!contact) return;

  await prisma.message.create({
    data: {
      tenantId: contact.tenantId,
      contactId: contact.id,
      channel,
      provider,
      providerMessageId,
      direction: 'INBOUND',
      status: 'DELIVERED',
      fromNumber: from,
      toNumber: '',
      body,
    },
  });
};

// Templates
export const listTemplates = async (tenantId: string) => {
  return prisma.messageTemplate.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'desc' } });
};

export const createTemplate = async (tenantId: string, input: CreateTemplateInput) => {
  return prisma.messageTemplate.create({ data: { tenantId, ...input } });
};

export const updateTemplate = async (tenantId: string, id: string, input: Partial<CreateTemplateInput>) => {
  const existing = await prisma.messageTemplate.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Template not found');
  return prisma.messageTemplate.update({ where: { id }, data: input });
};

export const deleteTemplate = async (tenantId: string, id: string) => {
  const existing = await prisma.messageTemplate.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Template not found');
  await prisma.messageTemplate.delete({ where: { id } });
};

// AI-drafted email templates
export const aiDraftEmail = async (input: AiDraftEmailInput): Promise<{ subject: string; body: string }> => {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError(
      400,
      'AI_NOT_CONFIGURED',
      'AI drafting is not configured for this workspace. Set ANTHROPIC_API_KEY to enable it.',
    );
  }

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system:
      'You are an expert marketing copywriter for an education/admissions consultancy. ' +
      'Draft a short, warm, professional outreach email. Use personalization placeholders ' +
      'like {{name}} where appropriate. Respond with ONLY valid JSON in the exact shape ' +
      '{"subject": "...", "body": "..."} — no markdown fences, no other text. The body should ' +
      'be plain text (no HTML), concise (under 150 words), and end with a clear call to action.',
    messages: [
      {
        role: 'user',
        content: `Topic: ${input.topic}${input.tone ? `\nDesired tone: ${input.tone}` : ''}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock && 'text' in textBlock ? textBlock.text : '';

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.subject === 'string' && typeof parsed.body === 'string') {
      return { subject: parsed.subject, body: parsed.body };
    }
    throw new Error('Malformed AI draft response');
  } catch {
    return { subject: `Re: ${input.topic}`, body: raw || 'AI draft could not be generated. Please try again.' };
  }
};

// Email configuration
export const getEmailConfig = async (tenantId: string) => {
  const config = await prisma.emailConfig.findUnique({ where: { tenantId } });
  if (config) return config;
  return {
    id: null,
    tenantId,
    provider: 'SES',
    sendingDomain: null,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    isVerified: false,
  };
};

export const upsertEmailConfig = async (tenantId: string, input: EmailConfigInput) => {
  const { smtpPassword, ...rest } = input;
  const data = {
    ...rest,
    ...(smtpPassword !== undefined ? { smtpPasswordEnc: smtpPassword } : {}),
  };

  return prisma.emailConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });
};
