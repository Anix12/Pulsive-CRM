import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { parse } from 'csv-parse/sync';
import { CreateContactInput, UpdateContactInput, CreateContactSchema } from './contacts.types';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status, temperature, assignedToId, tag, source, campaignId, minScore } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (temperature) where.temperature = temperature;
  if (assignedToId) where.assignedToId = assignedToId;
  if (tag) where.tags = { has: tag };
  if (source) where.source = source;
  if (campaignId) where.campaignId = campaignId;
  if (minScore) where.score = { gte: Number(minScore) };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  const { sortBy } = req.query as Record<string, string>;
  const orderBy = sortBy === 'score' ? { score: 'desc' as const } : { createdAt: 'desc' as const };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, skip, take: limit, orderBy }),
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
        subject: `Contact ${contact.firstName} created`,
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
