import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { createNotification } from '@/modules/notifications/notifications.service';
import { CreateTaskInput, UpdateTaskInput } from './tasks.types';

const includeRelations = {
  contact: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
};

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status, assignedToId, contactId, dueBefore, dueAfter, overdue, search } =
    req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;
  if (contactId) where.contactId = contactId;

  if (overdue === 'true') {
    where.status = 'PENDING';
    where.dueDate = { lt: new Date() };
  } else if (dueBefore || dueAfter) {
    where.dueDate = {};
    if (dueBefore) where.dueDate.lt = new Date(dueBefore);
    if (dueAfter) where.dueDate.gt = new Date(dueAfter);
  }

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: { dueDate: 'asc' },
      include: includeRelations,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, meta: paginationMeta(total, page, limit) };
};

export const getById = async (tenantId: string, id: string) => {
  const task = await prisma.task.findFirst({
    where: { id, tenantId },
    include: includeRelations,
  });
  if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');
  return task;
};

export const create = async (tenantId: string, userId: string, input: CreateTaskInput) => {
  const task = await prisma.task.create({
    data: {
      tenantId,
      title: input.title,
      description: input.description,
      contactId: input.contactId || undefined,
      dealId: input.dealId || undefined,
      assignedToId: input.assignedToId,
      dueDate: new Date(input.dueDate),
    },
    include: includeRelations,
  });

  await Promise.all([
    createNotification(tenantId, input.assignedToId, {
      type: 'TASK_ASSIGNED',
      title: `New task assigned: ${task.title}`,
      body: task.description || undefined,
      link: task.contactId ? `/dashboard/contacts/${task.contactId}` : undefined,
    }),
    prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        resource: 'tasks',
        resourceId: task.id,
        after: task as any,
      },
    }),
  ]);

  return task;
};

export const update = async (
  tenantId: string,
  userId: string,
  id: string,
  input: UpdateTaskInput,
) => {
  const existing = await prisma.task.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Task not found');

  const data: any = { ...input };
  if (input.dueDate) data.dueDate = new Date(input.dueDate);
  if ('contactId' in data && !data.contactId) data.contactId = null;
  if ('dealId' in data && !data.dealId) data.dealId = null;

  const updated = await prisma.task.update({ where: { id }, data, include: includeRelations });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'tasks',
      resourceId: id,
      before: existing as any,
      after: updated as any,
    },
  });

  return updated;
};

export const complete = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.task.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Task not found');

  const updated = await prisma.task.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: includeRelations,
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'tasks',
      resourceId: id,
      before: existing as any,
      after: updated as any,
    },
  });

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.task.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Task not found');

  await prisma.task.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: AUDIT_ACTIONS.DELETE,
      resource: 'tasks',
      resourceId: id,
      before: existing as any,
    },
  });
};
