import prisma from '@/db/client';

const ACTIVE_STATUSES = ['ON_THE_WAY', 'AT_SITE', 'VISITING', 'RETURNING'] as const;

// "Live" tracking without real device GPS: an agent's current state is derived from
// their most recent SiteVisit still in an active status. Once that visit is marked
// COMPLETED/CANCELLED/NO_SHOW/VISIT_DONE the agent falls back to IDLE.
export const overview = async (tenantId: string) => {
  const agents = await prisma.user.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  const activeVisits = await prisma.siteVisit.findMany({
    where: { tenantId, agentId: { not: null }, status: { in: ACTIVE_STATUSES as any } },
    orderBy: { statusAt: 'desc' },
    include: {
      contact: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, latitude: true, longitude: true, geofenceMeters: true } },
    },
  });

  const currentByAgent = new Map<string, (typeof activeVisits)[number]>();
  for (const v of activeVisits) {
    if (!v.agentId) continue;
    if (!currentByAgent.has(v.agentId)) currentByAgent.set(v.agentId, v);
  }

  const agentStatus = agents.map((agent) => {
    const visit = currentByAgent.get(agent.id);
    return {
      agentId: agent.id,
      name: `${agent.firstName} ${agent.lastName ?? ''}`.trim(),
      role: agent.role,
      status: visit?.status ?? 'IDLE',
      lead: visit?.contact?.name ?? null,
      project: visit?.project?.name ?? null,
      projectId: visit?.project?.id ?? null,
      latitude: visit?.project?.latitude ?? null,
      longitude: visit?.project?.longitude ?? null,
      statusAt: visit?.statusAt ?? null,
      lastSeen: visit?.statusAt ?? null,
    };
  });

  const countOf = (s: string) => agentStatus.filter((a) => a.status === s).length;

  return {
    summary: {
      totalAgents: agents.length,
      onTheWay: countOf('ON_THE_WAY'),
      atSite: countOf('AT_SITE'),
      visiting: countOf('VISITING'),
      returning: countOf('RETURNING'),
      idle: countOf('IDLE'),
    },
    agents: agentStatus,
  };
};

// Historical performance summary (visits/bookings/revenue) — separate from the live overview above.
export const performance = async (tenantId: string) => {
  const agents = await prisma.user.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  const [siteVisits, bookings] = await Promise.all([
    prisma.siteVisit.findMany({ where: { tenantId, agentId: { not: null } }, select: { agentId: true, status: true } }),
    prisma.booking.findMany({ where: { tenantId, agentId: { not: null } }, select: { agentId: true, status: true, totalAmount: true } }),
  ]);

  const stats = agents.map((agent) => {
    const visits = siteVisits.filter((v) => v.agentId === agent.id);
    const agentBookings = bookings.filter((b) => b.agentId === agent.id);
    const completedVisits = visits.filter((v) => v.status === 'COMPLETED' || v.status === 'VISIT_DONE').length;
    const confirmedBookings = agentBookings.filter((b) => b.status !== 'CANCELLED').length;

    return {
      agentId: agent.id,
      name: `${agent.firstName} ${agent.lastName}`.trim(),
      role: agent.role,
      totalVisits: visits.length,
      completedVisits,
      totalBookings: agentBookings.length,
      confirmedBookings,
      conversionPct: visits.length > 0 ? Math.round((confirmedBookings / visits.length) * 100) : 0,
      revenue: agentBookings
        .filter((b) => b.status !== 'CANCELLED')
        .reduce((sum, b) => sum + Number(b.totalAmount ?? 0), 0),
    };
  });

  return stats
    .filter((s) => s.totalVisits > 0 || s.totalBookings > 0)
    .sort((a, b) => b.confirmedBookings - a.confirmedBookings);
};
