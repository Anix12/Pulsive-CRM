import prisma from '@/db/client';

interface DateRange {
  from: Date;
  to: Date;
}

const parseDateRange = (from?: string, to?: string): DateRange => {
  const now = new Date();
  return {
    from: from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1),
    to: to ? new Date(to) : now,
  };
};

export const businessPerformance = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);

  const [
    totalCalls,
    completedCalls,
    totalMessages,
    deals,
    wonDeals,
    lostDeals,
  ] = await Promise.all([
    prisma.call.count({ where: { tenantId, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.call.count({ where: { tenantId, status: 'COMPLETED', createdAt: { gte: range.from, lte: range.to } } }),
    prisma.message.count({ where: { tenantId, direction: 'OUTBOUND', createdAt: { gte: range.from, lte: range.to } } }),
    prisma.deal.findMany({
      where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
      include: { stage: true },
    }),
    prisma.deal.aggregate({
      where: { tenantId, isWon: true, closedAt: { gte: range.from, lte: range.to } },
      _sum: { value: true },
      _count: true,
    }),
    prisma.deal.count({ where: { tenantId, isWon: false, closedAt: { gte: range.from, lte: range.to } } }),
  ]);

  const totalRevenue = wonDeals._sum.value || 0;
  const totalDeals = deals.length;
  const conversionRate = totalDeals > 0 ? ((wonDeals._count / totalDeals) * 100).toFixed(1) : '0';

  // Pipeline value by stage
  const pipelineByStage = deals.reduce((acc: Record<string, { count: number; value: number }>, deal) => {
    const stageName = deal.stage.name;
    if (!acc[stageName]) acc[stageName] = { count: 0, value: 0 };
    acc[stageName].count++;
    acc[stageName].value += Number(deal.value || 0);
    return acc;
  }, {});

  return {
    period: { from: range.from, to: range.to },
    calls: { total: totalCalls, completed: completedCalls, completionRate: totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : '0' },
    messages: { total: totalMessages },
    deals: { total: totalDeals, won: wonDeals._count, lost: lostDeals, conversionRate },
    revenue: { total: totalRevenue },
    pipeline: pipelineByStage,
  };
};

export const employeeAttribution = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);

  const [callsByAgent, messagesByAgent, dealsByAgent, users] = await Promise.all([
    prisma.call.groupBy({
      by: ['agentId'],
      where: { tenantId, agentId: { not: null }, createdAt: { gte: range.from, lte: range.to } },
      _count: true,
      _avg: { duration: true },
    }),
    prisma.message.groupBy({
      by: ['agentId'],
      where: { tenantId, agentId: { not: null }, direction: 'OUTBOUND', createdAt: { gte: range.from, lte: range.to } },
      _count: true,
    }),
    prisma.deal.findMany({
      where: { tenantId, assignedToId: { not: null }, createdAt: { gte: range.from, lte: range.to } },
      select: { assignedToId: true, isWon: true, value: true },
    }),
    prisma.user.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
  ]);

  return users.map((user) => {
    const calls = callsByAgent.find((c) => c.agentId === user.id);
    const msgs = messagesByAgent.find((m) => m.agentId === user.id);
    const userDeals = dealsByAgent.filter((d) => d.assignedToId === user.id);
    const wonDeals = userDeals.filter((d) => d.isWon);

    return {
      user: { id: user.id, name: `${user.firstName} ${user.lastName}`, role: user.role },
      calls: { total: calls?._count || 0, avgDuration: Math.round(calls?._avg?.duration || 0) },
      messages: { total: msgs?._count || 0 },
      deals: {
        total: userDeals.length,
        won: wonDeals.length,
        revenue: wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
      },
    };
  });
};

export const aiVsHuman = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);

  const [aiCalls, humanCalls, aiDeals, humanDeals] = await Promise.all([
    prisma.call.aggregate({
      where: { tenantId, isAiInitiated: true, status: 'COMPLETED', createdAt: { gte: range.from, lte: range.to } },
      _count: true,
      _avg: { duration: true },
    }),
    prisma.call.aggregate({
      where: { tenantId, isAiInitiated: false, status: 'COMPLETED', createdAt: { gte: range.from, lte: range.to } },
      _count: true,
      _avg: { duration: true },
    }),
    prisma.deal.aggregate({
      where: { tenantId, isWon: true, closedAt: { gte: range.from, lte: range.to } },
      _sum: { value: true },
      _count: true,
    }),
    prisma.deal.aggregate({
      where: { tenantId, isWon: true, closedAt: { gte: range.from, lte: range.to } },
      _sum: { value: true },
      _count: true,
    }),
  ]);

  return {
    period: { from: range.from, to: range.to },
    ai: {
      calls: { total: aiCalls._count, avgDuration: Math.round(aiCalls._avg?.duration || 0) },
    },
    human: {
      calls: { total: humanCalls._count, avgDuration: Math.round(humanCalls._avg?.duration || 0) },
      deals: { won: humanDeals._count, revenue: humanDeals._sum.value || 0 },
    },
  };
};
