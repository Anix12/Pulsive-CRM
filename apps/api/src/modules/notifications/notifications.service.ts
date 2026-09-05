import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { Request } from 'express';
import { CreateNotificationInput } from './notifications.types';

export const list = async (tenantId: string, userId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);

  const where = { tenantId, userId };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ]);

  return { notifications, unreadCount, meta: paginationMeta(total, page, limit) };
};

export const markRead = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.notification.findFirst({ where: { id, tenantId, userId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Notification not found');

  return prisma.notification.update({ where: { id }, data: { isRead: true } });
};

export const markAllRead = async (tenantId: string, userId: string) => {
  await prisma.notification.updateMany({
    where: { tenantId, userId, isRead: false },
    data: { isRead: true },
  });
  return { message: 'All notifications marked as read' };
};

/**
 * Reusable helper for other modules to create a notification for a user.
 * e.g. createNotification(tenantId, assignedToId, { type: 'TASK_ASSIGNED', title: '...', link: '...' })
 */
export const createNotification = async (
  tenantId: string,
  userId: string,
  input: CreateNotificationInput,
) => {
  return prisma.notification.create({
    data: {
      tenantId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
};
