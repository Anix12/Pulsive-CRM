import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { getWhatsAppProvider } from '@/providers/messaging';
import { Request } from 'express';
import { AudienceFilterInput, CreateBroadcastInput } from './broadcasts.types';

const audienceWhere = (tenantId: string, filter: AudienceFilterInput) => {
  const where: any = { tenantId };
  if (filter.audienceSource === 'CAMPAIGN' && filter.campaignId) where.campaignId = filter.campaignId;
  if (filter.audienceSource === 'STATUS' && filter.statusFilter) where.status = filter.statusFilter;
  return where;
};

export const previewAudience = async (tenantId: string, filter: AudienceFilterInput) => {
  const where = audienceWhere(tenantId, filter);
  const [total, byStatusRaw] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.groupBy({ by: ['status'], where, _count: { _all: true } }),
  ]);
  return {
    total,
    byStatus: byStatusRaw.map((s) => ({ status: s.status, count: s._count._all })),
  };
};

const renderTemplate = (body: string, contact: { name: string }) =>
  body.replace(/\{\{\s*name\s*\}\}/gi, contact.name);

/** Actually attempts to send a broadcast's messages. Shared by create() and resend(). */
const attemptSend = async (tenantId: string, broadcastId: string) => {
  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, tenantId },
    include: { template: true },
  });
  if (!broadcast) throw new AppError(404, 'NOT_FOUND', 'Broadcast not found');
  if (!broadcast.template) throw new AppError(400, 'VALIDATION_ERROR', 'Broadcast has no template');

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const providerConfig = {
    whatsappAccessToken: tenant?.whatsappAccessToken || undefined,
    whatsappPhoneNumberId: tenant?.whatsappPhoneNumberId || undefined,
  };

  let provider;
  try {
    provider = getWhatsAppProvider(providerConfig);
  } catch (err) {
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'FAILED', failureReason: (err as Error).message },
    });
    throw err;
  }

  const contacts = await prisma.contact.findMany({
    where: audienceWhere(tenantId, {
      audienceSource: broadcast.audienceSource,
      campaignId: broadcast.campaignId ?? undefined,
      statusFilter: broadcast.statusFilter ?? undefined,
    }),
    select: { id: true, name: true, whatsapp: true, phone: true },
  });

  await prisma.broadcast.update({ where: { id: broadcastId }, data: { status: 'SENDING', sentAt: new Date() } });

  for (const contact of contacts) {
    const toNumber = contact.whatsapp || contact.phone;
    const body = renderTemplate(broadcast.template.body, contact);

    const message = await prisma.message.create({
      data: {
        tenantId,
        contactId: contact.id,
        broadcastId,
        templateId: broadcast.templateId,
        channel: 'WHATSAPP',
        provider: 'meta',
        direction: 'OUTBOUND',
        status: 'PENDING',
        fromNumber: '',
        toNumber,
        body,
      },
    });

    try {
      const result = await provider.send({ to: toNumber, from: '', body });
      await prisma.message.update({
        where: { id: message.id },
        data: { status: 'SENT', sentAt: new Date(), providerMessageId: result.providerMessageId },
      });
    } catch (err) {
      await prisma.message.update({
        where: { id: message.id },
        data: { status: 'FAILED', failedAt: new Date(), failureReason: (err as Error).message },
      });
    }
  }

  return prisma.broadcast.update({
    where: { id: broadcastId },
    data: { status: 'COMPLETED', completedAt: new Date(), failureReason: null },
  });
};

export const create = async (tenantId: string, userId: string, input: CreateBroadcastInput) => {
  const template = await prisma.messageTemplate.findFirst({ where: { id: input.templateId, tenantId } });
  if (!template) throw new AppError(404, 'NOT_FOUND', 'Template not found');
  if (template.channel !== 'WHATSAPP') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Broadcasts can only use WhatsApp templates');
  }

  const { total } = await previewAudience(tenantId, input);

  const broadcast = await prisma.broadcast.create({
    data: {
      tenantId,
      name: input.name,
      templateId: input.templateId,
      audienceSource: input.audienceSource,
      campaignId: input.campaignId,
      statusFilter: input.statusFilter,
      audienceCount: total,
      createdById: userId,
      status: 'DRAFT',
    },
  });

  try {
    return await attemptSend(tenantId, broadcast.id);
  } catch {
    // attemptSend already recorded the failure reason on the broadcast row.
    return prisma.broadcast.findUnique({ where: { id: broadcast.id } });
  }
};

export const resend = async (tenantId: string, id: string) => {
  try {
    return await attemptSend(tenantId, id);
  } catch {
    return prisma.broadcast.findUnique({ where: { id } });
  }
};

const withStats = async (broadcasts: { id: string }[]) => {
  const ids = broadcasts.map((b) => b.id);
  if (ids.length === 0) return [];
  const grouped = await prisma.message.groupBy({
    by: ['broadcastId', 'status'],
    where: { broadcastId: { in: ids } },
    _count: { _all: true },
  });
  const statsByBroadcast = new Map<string, Record<string, number>>();
  for (const id of ids) statsByBroadcast.set(id, { SENT: 0, DELIVERED: 0, READ: 0, FAILED: 0, PENDING: 0 });
  for (const g of grouped) {
    if (!g.broadcastId) continue;
    statsByBroadcast.get(g.broadcastId)![g.status] = g._count._all;
  }
  return broadcasts.map((b) => ({ ...b, stats: statsByBroadcast.get(b.id) }));
};

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [broadcasts, total] = await Promise.all([
    prisma.broadcast.findMany({
      where: { tenantId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.broadcast.count({ where: { tenantId } }),
  ]);
  const withStatsData = await withStats(broadcasts);
  return { broadcasts: withStatsData, meta: paginationMeta(total, page, limit) };
};

export const overview = async (tenantId: string) => {
  const grouped = await prisma.message.groupBy({
    by: ['status'],
    where: { tenantId, channel: 'WHATSAPP', broadcastId: { not: null } },
    _count: { _all: true },
  });
  const stats: Record<string, number> = { SENT: 0, DELIVERED: 0, READ: 0, FAILED: 0, PENDING: 0 };
  for (const g of grouped) stats[g.status] = g._count._all;

  const broadcastedContacts = await prisma.message.findMany({
    where: { tenantId, channel: 'WHATSAPP', broadcastId: { not: null }, contactId: { not: null } },
    select: { contactId: true },
    distinct: ['contactId'],
  });
  const contactIds = broadcastedContacts.map((c) => c.contactId!).filter(Boolean);
  const repliedContacts = contactIds.length
    ? await prisma.message.findMany({
        where: { tenantId, channel: 'WHATSAPP', direction: 'INBOUND', contactId: { in: contactIds } },
        select: { contactId: true },
        distinct: ['contactId'],
      })
    : [];
  const replied = repliedContacts.length;

  const recent = await prisma.broadcast.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { template: { select: { id: true, name: true } }, campaign: { select: { id: true, name: true } } },
  });
  const recentWithStats = await withStats(recent);

  return { stats: { ...stats, REPLIED: replied }, recentBroadcasts: recentWithStats };
};
