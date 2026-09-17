import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { env } from '@/config/env';
import { Request } from 'express';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';
import { CreateContactSchema } from '@/modules/contacts/contacts.types';
import { CreateCampaignInput, UpdateCampaignInput } from './campaigns.types';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status, category } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: { _count: { select: { contacts: true } }, pipeline: { select: { id: true, name: true } } },
    }),
    prisma.campaign.count({ where }),
  ]);

  const campaignIds = campaigns.map((c) => c.id);
  const contacts = campaignIds.length
    ? await prisma.contact.findMany({
        where: { tenantId, campaignId: { in: campaignIds } },
        select: {
          campaignId: true,
          status: true,
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { calls: true } },
        },
      })
    : [];

  const statsByCampaign = new Map<
    string,
    { newCount: number; converted: number; calls: number; assignees: Map<string, { id: string; firstName: string; lastName: string | null }> }
  >();
  for (const id of campaignIds) {
    statsByCampaign.set(id, { newCount: 0, converted: 0, calls: 0, assignees: new Map() });
  }
  for (const contact of contacts) {
    if (!contact.campaignId) continue;
    const stat = statsByCampaign.get(contact.campaignId);
    if (!stat) continue;
    if (contact.status === 'LEAD') stat.newCount += 1;
    if (contact.status === 'CUSTOMER') stat.converted += 1;
    stat.calls += contact._count.calls;
    if (contact.assignedTo) stat.assignees.set(contact.assignedTo.id, contact.assignedTo);
  }

  const enriched = campaigns.map((c) => {
    const stat = statsByCampaign.get(c.id)!;
    return {
      ...c,
      stats: {
        total: c._count.contacts,
        new: stat.newCount,
        calls: stat.calls,
        converted: stat.converted,
        conversionPct: c._count.contacts > 0 ? Math.round((stat.converted / c._count.contacts) * 100) : 0,
      },
      assignees: Array.from(stat.assignees.values()).slice(0, 4),
    };
  });

  return { campaigns: enriched, meta: paginationMeta(total, page, limit) };
};

export const categories = async (tenantId: string) => {
  const grouped = await prisma.campaign.groupBy({
    by: ['category'],
    where: { tenantId },
    _count: { _all: true },
  });
  return grouped
    .map((g) => ({ category: g.category ?? 'Uncategorized', count: g._count._all }))
    .sort((a, b) => b.count - a.count);
};

export const togglePin = async (tenantId: string, id: string) => {
  const existing = await prisma.campaign.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
  return prisma.campaign.update({ where: { id }, data: { isPinned: !existing.isPinned } });
};

// (Re)generates the public lead-capture link for this campaign. Calling it again
// replaces the old token, which immediately invalidates any URL built on it.
export const generateWebhookToken = async (tenantId: string, id: string) => {
  const existing = await prisma.campaign.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Campaign not found');

  const token = crypto.randomBytes(16).toString('hex');
  const updated = await prisma.campaign.update({ where: { id }, data: { leadWebhookToken: token } });

  return {
    token: updated.leadWebhookToken,
    webhookUrl: `${env.API_URL}/api/v1/webhooks/integrate/${updated.leadWebhookToken}/leads`,
  };
};

export const getById = async (tenantId: string, id: string) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id, tenantId },
    include: {
      _count: { select: { contacts: true } },
      pipeline: { select: { id: true, name: true } },
      contacts: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          temperature: true,
          score: true,
          createdAt: true,
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { calls: true } },
        },
      },
    },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campaign not found');

  const newCount = campaign.contacts.filter((c) => c.status === 'LEAD').length;
  const converted = campaign.contacts.filter((c) => c.status === 'CUSTOMER').length;
  const calls = campaign.contacts.reduce((s, c) => s + c._count.calls, 0);

  return {
    ...campaign,
    stats: {
      total: campaign._count.contacts,
      new: newCount,
      calls,
      converted,
      conversionPct: campaign._count.contacts > 0 ? Math.round((converted / campaign._count.contacts) * 100) : 0,
    },
  };
};

export const create = async (tenantId: string, userId: string, input: CreateCampaignInput) => {
  const campaign = await prisma.campaign.create({
    data: { tenantId, ...input },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.CREATE,
      resource: 'campaigns',
      resourceId: campaign.id,
      after: campaign as any,
    },
  });

  return campaign;
};

export const update = async (
  tenantId: string,
  userId: string,
  id: string,
  input: UpdateCampaignInput,
) => {
  const existing = await prisma.campaign.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Campaign not found');

  const updated = await prisma.campaign.update({ where: { id }, data: input });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'campaigns',
      resourceId: id,
      before: existing as any,
      after: updated as any,
    },
  });

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.campaign.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Campaign not found');

  await prisma.campaign.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.DELETE,
      resource: 'campaigns',
      resourceId: id,
      before: existing as any,
    },
  });
};

export const importCsv = async (
  tenantId: string,
  userId: string,
  id: string,
  fileBuffer: Buffer,
  mapping: Record<string, string>,
) => {
  const campaign = await prisma.campaign.findFirst({ where: { id, tenantId } });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campaign not found');

  const rows: Record<string, string>[] = parse(fileBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const imported: string[] = [];
  const errors: { row: number; error: string }[] = [];

  const contactsToCreate: any[] = [];
  const validRows: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const mapped: Record<string, string> = {};
    for (const [csvCol, contactField] of Object.entries(mapping)) {
      if (contactField && raw[csvCol] !== undefined) {
        mapped[contactField] = raw[csvCol];
      }
    }
    if (!mapped.source) mapped.source = campaign.name;

    const result = CreateContactSchema.safeParse(mapped);
    if (!result.success) {
      errors.push({ row: i + 2, error: result.error.errors[0]?.message ?? 'Invalid row' });
    } else {
      contactsToCreate.push(result.data);
      validRows.push(i + 2);
    }
  }

  for (let i = 0; i < contactsToCreate.length; i++) {
    try {
      await prisma.contact.create({
        data: {
          tenantId,
          campaignId: id,
          ...contactsToCreate[i],
          tags: contactsToCreate[i].tags || [],
        } as any,
      });
      imported.push(validRows[i].toString());
    } catch (err: any) {
      errors.push({ row: validRows[i], error: err?.meta?.target ? 'Duplicate record' : 'Failed to insert' });
    }
  }

  if (imported.length > 0) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        resource: 'campaigns',
        resourceId: id,
        after: { count: imported.length, importedTo: id } as any,
      },
    });
  }

  return { imported: imported.length, failed: errors.length, errors };
};

// ─── Campaign Intelligence ──────────────────────────────────────────────────────

const isPaidAd = (source: string | null) => !!source && /ad|ads|ppc|google|facebook|meta/i.test(source);

export const campaignIntelligence = async (tenantId: string) => {
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId },
    include: {
      contacts: { select: { id: true, status: true, source: true, calls: { select: { id: true }, take: 1 }, messages: { select: { id: true }, take: 1 } } },
    },
  });

  const rankings = campaigns.map((c) => {
    const leads = c.contacts.length;
    const contacted = c.contacts.filter((ct) => ct.calls.length > 0 || ct.messages.length > 0).length;
    const converted = c.contacts.filter((ct) => ct.status === 'CUSTOMER').length;
    const lost = c.contacts.filter((ct) => ['CHURNED', 'BLOCKED'].includes(ct.status)).length;
    const interested = c.contacts.filter((ct) => ['PROSPECT', 'CUSTOMER'].includes(ct.status)).length;

    return {
      campaignId: c.id,
      name: c.name,
      leads,
      contactPct: leads > 0 ? Math.round((contacted / leads) * 100) : 0,
      interestPct: leads > 0 ? Math.round((interested / leads) * 100) : 0,
      conversionPct: leads > 0 ? Math.round((converted / leads) * 100) : 0,
      lostPct: leads > 0 ? Math.round((lost / leads) * 100) : 0,
      isPaid: isPaidAd(c.source ?? c.category),
    };
  });

  const totalLeads = rankings.reduce((s, r) => s + r.leads, 0);
  const totalContacted = campaigns.reduce((s, c) => s + c.contacts.filter((ct) => ct.calls.length > 0 || ct.messages.length > 0).length, 0);
  const totalConverted = campaigns.reduce((s, c) => s + c.contacts.filter((ct) => ct.status === 'CUSTOMER').length, 0);
  const totalLost = campaigns.reduce((s, c) => s + c.contacts.filter((ct) => ['CHURNED', 'BLOCKED'].includes(ct.status)).length, 0);

  const paid = rankings.filter((r) => r.isPaid);
  const web = rankings.filter((r) => !r.isPaid);
  const channelStats = (group: typeof rankings) => {
    const leads = group.reduce((s, r) => s + r.leads, 0);
    return {
      leads,
      contactedPct: leads > 0 ? Math.round(group.reduce((s, r) => s + (r.contactPct * r.leads) / 100, 0) / leads * 100) : 0,
      convertedPct: leads > 0 ? Math.round(group.reduce((s, r) => s + (r.conversionPct * r.leads) / 100, 0) / leads * 100) : 0,
      lostPct: leads > 0 ? Math.round(group.reduce((s, r) => s + (r.lostPct * r.leads) / 100, 0) / leads * 100) : 0,
    };
  };

  const best = rankings.slice().sort((a, b) => b.conversionPct - a.conversionPct)[0] ?? null;

  return {
    kpis: {
      campaignCount: campaigns.length,
      totalLeads,
      contactRate: totalLeads > 0 ? Math.round((totalContacted / totalLeads) * 100) : 0,
      conversionRate: totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0,
      lostRate: totalLeads > 0 ? Math.round((totalLost / totalLeads) * 100) : 0,
    },
    channels: {
      paidAds: channelStats(paid),
      webLeads: channelStats(web),
    },
    rankings: rankings.sort((a, b) => b.leads - a.leads),
    bestPerformingCampaign: best,
  };
};
