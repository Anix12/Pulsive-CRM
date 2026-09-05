import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { parse } from 'csv-parse/sync';
import { CreateContactInput, UpdateContactInput, CreateContactSchema } from './contacts.types';

export const overview = async (tenantId: string, range: string) => {
  const now = new Date();
  let rangeStart: Date | null = null;
  if (range === 'today') {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'week') {
    rangeStart = new Date(now);
    rangeStart.setDate(now.getDate() - 7);
  } else if (range === 'month') {
    rangeStart = new Date(now);
    rangeStart.setMonth(now.getMonth() - 1);
  }

  const createdWhere: any = { tenantId };
  if (rangeStart) createdWhere.createdAt = { gte: rangeStart };

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [total, converted, byStatusRaw, bySourceRaw, unassigned, overdueTasks, dailyContacts] = await Promise.all([
    prisma.contact.count({ where: createdWhere }),
    prisma.contact.count({ where: { ...createdWhere, status: 'CUSTOMER' } }),
    prisma.contact.groupBy({ by: ['status'], where: createdWhere, _count: { _all: true } }),
    prisma.contact.groupBy({ by: ['source'], where: createdWhere, _count: { _all: true } }),
    prisma.contact.count({ where: { tenantId, assignedToId: null } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING', dueDate: { lt: now }, contactId: { not: null } } }),
    prisma.contact.findMany({ where: { tenantId, createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
  ]);

  const conversionRate = total > 0 ? Math.round((converted / total) * 1000) / 10 : 0;
  const sourceCount = bySourceRaw.filter((s) => s.source).length;

  const dailyNewLeads = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    const dayKey = d.toDateString();
    const count = dailyContacts.filter((c) => new Date(c.createdAt).toDateString() === dayKey).length;
    return { date: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { weekday: 'short' }), count };
  });

  return {
    total,
    converted,
    unassigned,
    overdueTasks,
    conversionRate,
    sourceCount,
    byStatus: byStatusRaw.map((s) => ({ status: s.status, count: s._count._all })),
    bySource: bySourceRaw
      .map((s) => ({ source: s.source ?? 'Unknown', count: s._count._all }))
      .sort((a, b) => b.count - a.count),
    dailyNewLeads,
  };
};

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status, temperature, assignedToId, tag, source, campaignId, minScore } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (temperature) where.temperature = temperature;
  if (assignedToId === 'unassigned') where.assignedToId = null;
  else if (assignedToId) where.assignedToId = assignedToId;
  if (tag) where.tags = { has: tag };
  if (source) where.source = source;
  if (campaignId) where.campaignId = campaignId;
  if (minScore) where.score = { gte: Number(minScore) };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  const { sortBy } = req.query as Record<string, string>;
  const orderBy = sortBy === 'score' ? { score: 'desc' as const } : { createdAt: 'desc' as const };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.contact.count({ where }),
  ]);

  return { contacts, meta: paginationMeta(total, page, limit) };
};

export const getById = async (tenantId: string, id: string) => {
  const contact = await prisma.contact.findFirst({
    where: { id, tenantId },
    include: {
      activities: { orderBy: { occurredAt: 'desc' }, take: 20 },
      deals: { include: { stage: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!contact) throw new AppError(404, 'NOT_FOUND', 'Contact not found');
  return contact;
};

export const create = async (tenantId: string, userId: string, input: CreateContactInput) => {
  const contact = await prisma.contact.create({
    data: { tenantId, ...input, tags: input.tags || [] } as any,
  });

  await Promise.all([
    prisma.activity.create({
      data: {
        tenantId,
        contactId: contact.id,
        userId,
        type: 'CONTACT_CREATED',
        subject: `Contact ${contact.name} created`,
      },
    }),
    prisma.onboardingProgress.updateMany({
      where: { tenantId, addedFirstContact: false },
      data: { addedFirstContact: true },
    }),
    prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        resource: 'contacts',
        resourceId: contact.id,
        after: contact as any,
      },
    }),
  ]);

  return contact;
};

export const update = async (
  tenantId: string,
  userId: string,
  id: string,
  input: UpdateContactInput,
) => {
  const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Contact not found');

  const updated = await prisma.contact.update({ where: { id }, data: input as any });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'contacts',
      resourceId: id,
      before: existing as any,
      after: updated as any,
    },
  });

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Contact not found');

  await prisma.contact.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.DELETE,
      resource: 'contacts',
      resourceId: id,
      before: existing as any,
    },
  });
};

export const importCsv = async (
  tenantId: string,
  userId: string,
  fileBuffer: Buffer,
  mapping: Record<string, string>,
) => {
  const rows: Record<string, string>[] = parse(fileBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const imported: string[] = [];
  const errors: { row: number; error: string }[] = [];

  const contactsToCreate: CreateContactInput[] = [];
  const validRows: number[] = [];

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
    } else {
      contactsToCreate.push(result.data);
      validRows.push(i + 2);
    }
  }

  for (let i = 0; i < contactsToCreate.length; i++) {
    try {
      await prisma.contact.create({
        data: { tenantId, ...contactsToCreate[i], tags: contactsToCreate[i].tags || [] } as any,
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
        resource: 'contacts',
        resourceId: 'bulk-import',
        after: { count: imported.length } as any,
      },
    });

    await prisma.onboardingProgress.updateMany({
      where: { tenantId, addedFirstContact: false },
      data: { addedFirstContact: true },
    });
  }

  return { imported: imported.length, failed: errors.length, errors };
};
