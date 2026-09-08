import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreateProjectInput, UpdateProjectInput } from './real-estate.types';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status, city } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (city) where.city = city;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { units: true, siteVisits: true, bookings: true } } },
    }),
    prisma.project.count({ where }),
  ]);

  return { projects, meta: paginationMeta(total, page, limit) };
};

export const getById = async (tenantId: string, id: string) => {
  const project = await prisma.project.findFirst({
    where: { id, tenantId },
    include: {
      units: { orderBy: { unitNumber: 'asc' } },
      _count: { select: { units: true, siteVisits: true, bookings: true } },
    },
  });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');
  return project;
};

export const create = async (tenantId: string, userId: string, input: CreateProjectInput) => {
  const project = await prisma.project.create({ data: { tenantId, ...input } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 're_projects', resourceId: project.id, after: project as any },
  });

  return project;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdateProjectInput) => {
  const existing = await prisma.project.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Project not found');

  const updated = await prisma.project.update({ where: { id }, data: input });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 're_projects', resourceId: id, before: existing as any, after: updated as any },
  });

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.project.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Project not found');

  await prisma.project.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 're_projects', resourceId: id, before: existing as any },
  });
};
