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

export const stats = async (tenantId: string) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86_400_000);

  const [total, completed, overdue, dueTodayUpcoming, upcoming, byAssigneeRaw, users] = await Promise.all([
    prisma.task.count({ where: { tenantId } }),
    prisma.task.count({ where: { tenantId, status: 'COMPLETED' } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING', dueDate: { lt: now } } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING', dueDate: { gte: now, lt: endOfToday } } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING', dueDate: { gte: endOfToday } } }),
    prisma.task.groupBy({ by: ['assignedToId'], where: { tenantId }, _count: { _all: true } }),
    prisma.user.findMany({ where: { tenantId }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  const byAssignee = byAssigneeRaw
    .map((row) => {
      const user = users.find((u) => u.id === row.assignedToId);
      return { assignedToId: row.assignedToId, name: user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Unknown', count: row._count._all };
    })
    .sort((a, b) => b.count - a.count);

  // Completed-over-time: trailing 14 days, bucketed by the real `completedAt` timestamp
  // recorded when each task was marked done — a genuine historical event, not a due-date.
  const fourteenDaysAgo = new Date(startOfToday.getTime() - 13 * 86_400_000);
  const recentlyCompleted = await prisma.task.findMany({
    where: { tenantId, status: 'COMPLETED', completedAt: { gte: fourteenDaysAgo } },
    select: { completedAt: true },
  });
  const completedOverTime = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(fourteenDaysAgo);
    d.setDate(d.getDate() + i);
    const dayKey = d.toDateString();
    const count = recentlyCompleted.filter((t) => t.completedAt && t.completedAt.toDateString() === dayKey).length;
    return { date: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count };
  });

  return { total, completed, overdue, dueToday: dueTodayUpcoming, upcoming, byAssignee, completedOverTime };
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
