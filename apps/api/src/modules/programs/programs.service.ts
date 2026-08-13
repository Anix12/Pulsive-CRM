import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreateProgramInput, UpdateProgramInput } from './programs.types';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, degreeLevel, department, isActive } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (degreeLevel) where.degreeLevel = degreeLevel;
  if (department) where.department = department;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [programs, total] = await Promise.all([
    prisma.program.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    }),
    prisma.program.count({ where }),
  ]);

  return { programs, meta: paginationMeta(total, page, limit) };
};

export const getById = async (tenantId: string, id: string) => {
  const program = await prisma.program.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { applications: true } } },
  });
  if (!program) throw new AppError(404, 'NOT_FOUND', 'Program not found');
  return program;
};

export const create = async (tenantId: string, userId: string, input: CreateProgramInput) => {
  const existing = await prisma.program.findFirst({ where: { tenantId, code: input.code } });
  if (existing) throw new AppError(409, 'DUPLICATE_CODE', `A program with code "${input.code}" already exists`);

  const program = await prisma.program.create({
    data: { tenantId, ...input },
  });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 'programs', resourceId: program.id, after: program as any },
  });

  return program;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdateProgramInput) => {
  const existing = await prisma.program.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Program not found');

  if (input.code && input.code !== existing.code) {
    const codeTaken = await prisma.program.findFirst({ where: { tenantId, code: input.code, NOT: { id } } });
    if (codeTaken) throw new AppError(409, 'DUPLICATE_CODE', `A program with code "${input.code}" already exists`);
  }

  const updated = await prisma.program.update({ where: { id }, data: input });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 'programs', resourceId: id, before: existing as any, after: updated as any },
  });

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.program.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { applications: true } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Program not found');

  if (existing._count.applications > 0) {
    throw new AppError(400, 'HAS_APPLICATIONS', 'Cannot delete a program with applications; deactivate it instead');
  }

  await prisma.program.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 'programs', resourceId: id, before: existing as any },
  });
};
