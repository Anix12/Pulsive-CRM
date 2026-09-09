import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreateUnitInput, UpdateUnitInput } from './real-estate.types';

export const listByProject = async (tenantId: string, projectId: string, req: Request) => {
  const { status } = req.query as Record<string, string>;
  const where: any = { tenantId, projectId };
  if (status) where.status = status;

  return prisma.unit.findMany({ where, orderBy: { unitNumber: 'asc' } });
};

export const getById = async (tenantId: string, id: string) => {
  const unit = await prisma.unit.findFirst({ where: { id, tenantId }, include: { project: { select: { id: true, name: true } } } });
  if (!unit) throw new AppError(404, 'NOT_FOUND', 'Unit not found');
  return unit;
};

export const create = async (tenantId: string, userId: string, projectId: string, input: CreateUnitInput) => {
  const project = await prisma.project.findFirst({ where: { id: projectId, tenantId } });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

  const unit = await prisma.unit.create({ data: { tenantId, projectId, ...input } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 're_units', resourceId: unit.id, after: unit as any },
  });

  return unit;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdateUnitInput) => {
  const existing = await prisma.unit.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Unit not found');

  const updated = await prisma.unit.update({ where: { id }, data: input });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 're_units', resourceId: id, before: existing as any, after: updated as any },
  });

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.unit.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Unit not found');

  await prisma.unit.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 're_units', resourceId: id, before: existing as any },
  });
};
