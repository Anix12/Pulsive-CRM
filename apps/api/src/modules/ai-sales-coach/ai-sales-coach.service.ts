import prisma from '@/db/client';

const DISPOSITION_CATEGORY_COLOR: Record<string, string> = {
  Connected: '#16A34A',
  'Follow Up': '#7C3AED',
  'Not Connected': '#DC2626',
  Unclassified: '#9795AC',
};

const mapLiveCall = (c: {
  id: string; startedAt: Date | null; toNumber: string; isAiInitiated: boolean;
  contact: { id: string; name: string; phone: string } | null;
  agent: { id: string; firstName: string; lastName: string } | null;
  disposition: { name: string; category: string } | null;
}) => ({
  id: c.id,
  contactId: c.contact?.id ?? null,
  agentId: c.agent?.id ?? null,
  agent: c.agent ? `${c.agent.firstName} ${c.agent.lastName}`.trim() : 'Unassigned',
  lead: c.contact?.name ?? c.toNumber,
  phone: c.contact?.phone ?? c.toNumber,
  startedAt: c.startedAt,
  disposition: c.disposition?.name ?? null,
  isAiInitiated: c.isAiInitiated,
});

const mapActivity = (a: {
  id: string; type: string; subject: string; body: string | null; occurredAt: Date;
  contact: { id: string; name: string } | null;
  user: { firstName: string; lastName: string };
}) => ({
  id: a.id,
  type: a.type,
  subject: a.subject,
  body: a.body,
  occurredAt: a.occurredAt,
  contactId: a.contact?.id ?? null,
  contactName: a.contact?.name ?? null,
  userName: `${a.user.firstName} ${a.user.lastName}`.trim(),
});

export const getLiveCalls = async (tenantId: string, limit?: number) => {
  const rows = await prisma.call.findMany({
    where: { tenantId, status: 'IN_PROGRESS' },
    ...(limit ? { take: limit } : {}),
    orderBy: { startedAt: 'desc' },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      agent: { select: { id: true, firstName: true, lastName: true } },
      disposition: { select: { name: true, category: true } },
    },
  });
  return rows.map(mapLiveCall);
};

export const getActivityFeed = async (tenantId: string, limit = 50) => {
  const rows = await prisma.activity.findMany({
    where: { tenantId },
    orderBy: { occurredAt: 'desc' },
    take: limit,
    include: {
      contact: { select: { id: true, name: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  return rows.map(mapActivity);
};

export const overview = async (tenantId: string) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);
  const todayRange = { gte: startOfToday, lt: endOfToday };

  const [
    activeCalls,
    liveCallRows,
    contactedTodayGroups,
    qualifiedToday,
    convertedDeals,
    lostDeals,
    revenueAgg,
    agents,
    todaysCalls,
    activityRows,
  ] = await Promise.all([
    prisma.call.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
    prisma.call.findMany({
      where: { tenantId, status: 'IN_PROGRESS' },
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
        disposition: { select: { name: true, category: true } },
      },
    }),
    prisma.call.groupBy({ by: ['contactId'], where: { tenantId, contactId: { not: null }, createdAt: todayRange } }),
    prisma.contact.count({ where: { tenantId, status: 'PROSPECT', updatedAt: todayRange } }),
    prisma.deal.count({ where: { tenantId, isWon: true, closedAt: todayRange } }),
    prisma.deal.count({ where: { tenantId, isWon: false, closedAt: todayRange } }),
    prisma.deal.aggregate({ where: { tenantId, isWon: true, closedAt: todayRange }, _sum: { value: true } }),
    prisma.user.findMany({ where: { tenantId, role: { in: ['AGENT', 'MANAGER'] }, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true } }),
    prisma.call.findMany({ where: { tenantId, createdAt: todayRange }, include: { disposition: { select: { name: true, category: true } } } }),
    prisma.activity.findMany({
      where: { tenantId },
      orderBy: { occurredAt: 'desc' },
      take: 10,
      include: {
        contact: { select: { id: true, name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  // Live Calls Monitor
  const liveCalls = liveCallRows.map(mapLiveCall);

  // Team performance (today)
  const teamPerformance = await Promise.all(
    agents.map(async (a) => {
      const [calls, qualified, converted] = await Promise.all([
        prisma.call.count({ where: { tenantId, agentId: a.id, createdAt: todayRange } }),
        prisma.contact.count({ where: { tenantId, assignedToId: a.id, status: 'PROSPECT', updatedAt: todayRange } }),
        prisma.deal.count({ where: { tenantId, assignedToId: a.id, isWon: true, closedAt: todayRange } }),
      ]);
      return {
        agentId: a.id,
        name: `${a.firstName} ${a.lastName}`.trim(),
        calls,
        qualified,
        converted,
        rate: calls > 0 ? Math.round((converted / calls) * 1000) / 10 : 0,
      };
    }),
  );

  // Call outcomes (today, by disposition)
  const byDisposition: Record<string, { category: string; count: number }> = {};
  let noDisposition = 0;
  for (const c of todaysCalls) {
    if (!c.disposition) { noDisposition++; continue; }
    const key = c.disposition.name;
    if (!byDisposition[key]) byDisposition[key] = { category: c.disposition.category, count: 0 };
    byDisposition[key].count++;
  }
  const callOutcomes = Object.entries(byDisposition)
    .map(([name, d]) => ({ label: name, count: d.count, category: d.category, color: DISPOSITION_CATEGORY_COLOR[d.category] ?? DISPOSITION_CATEGORY_COLOR.Unclassified }))
    .sort((a, b) => b.count - a.count);
  if (noDisposition > 0) {
    callOutcomes.push({ label: 'No Disposition', count: noDisposition, category: 'Unclassified', color: DISPOSITION_CATEGORY_COLOR.Unclassified });
  }

  const revenueToday = Number(revenueAgg._sum.value ?? 0);

  return {
    kpis: {
      activeCalls,
      leadsContactedToday: contactedTodayGroups.length,
      qualifiedLeadsToday: qualifiedToday,
      convertedToday: convertedDeals,
      lostToday: lostDeals,
      revenueToday,
    },
    liveCalls,
    activityFeed: activityRows.map(mapActivity),
    teamPerformance,
    callOutcomes,
    totalCallsToday: todaysCalls.length,
  };
};
