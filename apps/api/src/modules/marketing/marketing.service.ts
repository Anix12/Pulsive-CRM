import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { parse } from 'csv-parse/sync';
import { CreateContactSchema } from '@/modules/contacts/contacts.types';
import {
  CreateMarketingListInput,
  UpdateMarketingListInput,
  CreateMarketingCampaignInput,
  UpdateMarketingCampaignInput,
} from './marketing.types';

// ── Marketing Lists ─────────────────────────────────────────────────────────

export const listLists = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { tag, search } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (tag) where.tags = { has: tag };
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [lists, total] = await Promise.all([
    prisma.marketingList.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    }),
    prisma.marketingList.count({ where }),
  ]);

  return { lists, meta: paginationMeta(total, page, limit) };
};

export const getListById = async (tenantId: string, id: string) => {
  const list = await prisma.marketingList.findFirst({
    where: { id, tenantId },
    include: {
      _count: { select: { members: true } },
      members: {
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      },
    },
  });
  if (!list) throw new AppError(404, 'NOT_FOUND', 'Marketing list not found');
  return list;
};

export const createList = async (tenantId: string, userId: string, input: CreateMarketingListInput) => {
  const list = await prisma.marketingList.create({
    data: { tenantId, name: input.name, tags: input.tags || [] },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.CREATE,
      resource: 'marketing-lists',
      resourceId: list.id,
      after: list as any,
    },
  });

  return list;
};

export const updateList = async (
  tenantId: string,
  userId: string,
  id: string,
  input: UpdateMarketingListInput,
) => {
  const existing = await prisma.marketingList.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Marketing list not found');

  const updated = await prisma.marketingList.update({ where: { id }, data: input as any });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'marketing-lists',
      resourceId: id,
      before: existing as any,
      after: updated as any,
    },
  });

  return updated;
};

export const removeList = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.marketingList.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Marketing list not found');

  await prisma.marketingList.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.DELETE,
      resource: 'marketing-lists',
      resourceId: id,
      before: existing as any,
    },
  });
};

export const uploadCsv = async (
  tenantId: string,
  userId: string,
  id: string,
  fileBuffer: Buffer,
  mapping: Record<string, string>,
) => {
  const list = await prisma.marketingList.findFirst({ where: { id, tenantId } });
  if (!list) throw new AppError(404, 'NOT_FOUND', 'Marketing list not found');

  const rows: Record<string, string>[] = parse(fileBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const imported: string[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const mapped: Record<string, string> = {};
    for (const [csvCol, contactField] of Object.entries(mapping)) {
      if (contactField && raw[csvCol] !== undefined) {
        mapped[contactField] = raw[csvCol];
      }
    }

    const result = CreateContactSchema.safeParse(mapped);
    if (!result.success) {
      errors.push({ row: i + 2, error: result.error.errors[0]?.message ?? 'Invalid row' });
      continue;
    }

    try {
      // Match an existing contact by phone or email, otherwise create a new one.
      let contact = await prisma.contact.findFirst({
        where: {
          tenantId,
          OR: [
            { phone: result.data.phone },
            ...(result.data.email ? [{ email: result.data.email }] : []),
          ],
        },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: { tenantId, ...result.data, tags: result.data.tags || [] } as any,
        });
      }

      await prisma.marketingListMember.create({
        data: { listId: id, contactId: contact.id },
      });

      imported.push((i + 2).toString());
    } catch (err: any) {
      // Unique constraint on [listId, contactId] means the contact is already in the list.
      errors.push({ row: i + 2, error: err?.code === 'P2002' ? 'Already in list' : 'Failed to add' });
    }
  }

  if (imported.length > 0) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        resource: 'marketing-lists',
        resourceId: id,
        after: { count: imported.length, addedTo: id } as any,
      },
    });
  }

  return { imported: imported.length, failed: errors.length, errors };
};

// ── Marketing Campaigns (bulk sends) ────────────────────────────────────────
// NOTE: actual message dispatch/queueing for SCHEDULED/SENT campaigns is not
// implemented here. When that's built, it should hook into the existing
// messaging queue processor at `apps/api/src/queue/processors/` — this module
// only manages campaign CRUD + status metadata for now.

export const listCampaigns = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;

  const [campaigns, total] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { list: { select: { id: true, name: true } } },
    }),
    prisma.marketingCampaign.count({ where }),
  ]);

  return { campaigns, meta: paginationMeta(total, page, limit) };
};

export const getCampaignById = async (tenantId: string, id: string) => {
  const campaign = await prisma.marketingCampaign.findFirst({
    where: { id, tenantId },
    include: { list: { select: { id: true, name: true } } },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Marketing campaign not found');
  return campaign;
};

export const createCampaign = async (
  tenantId: string,
  userId: string,
  input: CreateMarketingCampaignInput,
) => {
  const list = await prisma.marketingList.findFirst({ where: { id: input.listId, tenantId } });
  if (!list) throw new AppError(404, 'NOT_FOUND', 'Marketing list not found');

  const campaign = await prisma.marketingCampaign.create({
    data: {
      tenantId,
      listId: input.listId,
      name: input.name,
      channel: input.channel,
      templateId: input.templateId,
      status: input.status,
      scheduledAt: input.scheduledAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.CREATE,
      resource: 'marketing-campaigns',
      resourceId: campaign.id,
      after: campaign as any,
    },
  });

  return campaign;
};

export const updateCampaign = async (
  tenantId: string,
  userId: string,
  id: string,
  input: UpdateMarketingCampaignInput,
) => {
  const existing = await prisma.marketingCampaign.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Marketing campaign not found');

  if (input.listId) {
    const list = await prisma.marketingList.findFirst({ where: { id: input.listId, tenantId } });
    if (!list) throw new AppError(404, 'NOT_FOUND', 'Marketing list not found');
  }

  const updated = await prisma.marketingCampaign.update({ where: { id }, data: input as any });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'marketing-campaigns',
      resourceId: id,
      before: existing as any,
      after: updated as any,
    },
  });

  return updated;
};

export const removeCampaign = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.marketingCampaign.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Marketing campaign not found');

  await prisma.marketingCampaign.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.DELETE,
      resource: 'marketing-campaigns',
      resourceId: id,
      before: existing as any,
    },
  });
};
