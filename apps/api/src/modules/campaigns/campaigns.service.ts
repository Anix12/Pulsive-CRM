import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { parse } from 'csv-parse/sync';
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
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { contacts: true } } },
    }),
    prisma.campaign.count({ where }),
  ]);

  return { campaigns, meta: paginationMeta(total, page, limit) };
};

export const getById = async (tenantId: string, id: string) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id, tenantId },
    include: {
      _count: { select: { contacts: true } },
      contacts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          status: true,
          temperature: true,
          score: true,
          createdAt: true,
        },
      },
    },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
  return campaign;
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
