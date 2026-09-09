import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreatePartnerInput, UpdatePartnerInput } from './real-estate.types';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, kycStatus, isActive } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (kycStatus) where.kycStatus = kycStatus;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.partner.count({ where }),
  ]);

  return { partners, meta: paginationMeta(total, page, limit) };
};

export const getById = async (tenantId: string, id: string) => {
  const partner = await prisma.partner.findFirst({ where: { id, tenantId } });
  if (!partner) throw new AppError(404, 'NOT_FOUND', 'Partner not found');
  return partner;
};

export const create = async (tenantId: string, userId: string, input: CreatePartnerInput) => {
  const partner = await prisma.partner.create({ data: { tenantId, ...input } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 're_partners', resourceId: partner.id, after: partner as any },
  });

  return partner;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdatePartnerInput) => {
  const existing = await prisma.partner.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Partner not found');

  const updated = await prisma.partner.update({ where: { id }, data: input });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 're_partners', resourceId: id, before: existing as any, after: updated as any },
  });

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.partner.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Partner not found');

  await prisma.partner.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 're_partners', resourceId: id, before: existing as any },
  });
};
