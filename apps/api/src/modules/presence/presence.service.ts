import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { StartBreakInput } from './presence.types';

export const heartbeat = async (tenantId: string, userId: string) => {
  const existing = await prisma.agentPresence.findUnique({ where: { userId } });
  if (existing?.status === 'BREAK') {
    // Heartbeats don't interrupt an active break; agent must explicitly end it.
    return prisma.agentPresence.update({ where: { userId }, data: { lastActiveAt: new Date() } });
  }
  return prisma.agentPresence.upsert({
    where: { userId },
    create: { tenantId, userId, status: 'ACTIVE', lastActiveAt: new Date() },
    update: { status: 'ACTIVE', lastActiveAt: new Date() },
  });
};

export const startBreak = async (tenantId: string, userId: string, input: StartBreakInput) => {
  await prisma.agentBreakLog.create({ data: { tenantId, userId, label: input.label } });
  return prisma.agentPresence.upsert({
    where: { userId },
    create: { tenantId, userId, status: 'BREAK', currentBreakLabel: input.label, breakStartedAt: new Date(), lastActiveAt: new Date() },
    update: { status: 'BREAK', currentBreakLabel: input.label, breakStartedAt: new Date() },
  });
};

export const endBreak = async (tenantId: string, userId: string) => {
  const presence = await prisma.agentPresence.findUnique({ where: { userId } });
  if (!presence || presence.status !== 'BREAK') throw new AppError(400, 'NOT_ON_BREAK', 'Agent is not currently on a break');

  const openLog = await prisma.agentBreakLog.findFirst({
    where: { tenantId, userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  if (openLog) {
    await prisma.agentBreakLog.update({ where: { id: openLog.id }, data: { endedAt: new Date() } });
  }

  return prisma.agentPresence.update({
    where: { userId },
    data: { status: 'ACTIVE', currentBreakLabel: null, breakStartedAt: null, lastActiveAt: new Date() },
  });
};

export const getMyPresence = async (userId: string) => {
  return prisma.agentPresence.findUnique({ where: { userId } });
};

// Floor status for the dashboard's Agent Activity panel
export const listAgentFloor = async (tenantId: string) => {
  const [tenant, users, presences] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { inactivityTimeoutMinutes: true } }),
    prisma.user.findMany({
      where: { tenantId, status: 'ACTIVE', role: { in: ['AGENT', 'MANAGER', 'ADMIN'] } },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: 'asc' },
    }),
    prisma.agentPresence.findMany({ where: { tenantId } }),
  ]);

  const timeoutMs = (tenant?.inactivityTimeoutMinutes ?? 15) * 60 * 1000;
  const now = Date.now();
  const byUser = new Map(presences.map((p) => [p.userId, p]));

  return users.map((u) => {
    const presence = byUser.get(u.id);
    let status: 'ACTIVE' | 'BREAK' | 'INACTIVE' | 'NOT_STARTED' = 'NOT_STARTED';
    let breakMinutes: number | null = null;

    if (presence) {
      if (presence.status === 'BREAK') {
        status = 'BREAK';
        breakMinutes = presence.breakStartedAt ? Math.round((now - presence.breakStartedAt.getTime()) / 60000) : 0;
      } else if (now - presence.lastActiveAt.getTime() > timeoutMs) {
        status = 'INACTIVE';
      } else {
        status = 'ACTIVE';
      }
    }

    return {
      userId: u.id,
      name: `${u.firstName} ${u.lastName ?? ''}`.trim(),
      role: u.role,
      status,
      breakLabel: presence?.currentBreakLabel ?? null,
      breakMinutes,
      lastActiveAt: presence?.lastActiveAt ?? null,
    };
  });
};
