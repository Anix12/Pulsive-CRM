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

// ─── Dashboard Overview (KPI tiles + Today's Activity strip) ──────────────────

export const dashboardOverview = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalLeads,
    newLeadsInRange,
    pendingFollowups,
    overdueFollowups,
    wonDealsInRange,
    closedDealsInRange,
    callsInRange,
    smsInRange,
    emailsInRange,
    tasksDueToday,
  ] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.contact.count({ where: { tenantId, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING', dueDate: { lt: now } } }),
    prisma.deal.count({ where: { tenantId, isWon: true, closedAt: { gte: range.from, lte: range.to } } }),
    prisma.deal.count({ where: { tenantId, isWon: { not: null }, closedAt: { gte: range.from, lte: range.to } } }),
    prisma.call.count({ where: { tenantId, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.message.count({ where: { tenantId, channel: 'SMS', direction: 'OUTBOUND', createdAt: { gte: range.from, lte: range.to } } }),
    prisma.message.count({ where: { tenantId, channel: 'EMAIL', direction: 'OUTBOUND', createdAt: { gte: range.from, lte: range.to } } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING', dueDate: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 86400000) } } }),
  ]);

  const conversionRate = closedDealsInRange > 0 ? Math.round((wonDealsInRange / closedDealsInRange) * 100) : 0;

  return {
    period: { from: range.from, to: range.to },
    leads: {
      total: totalLeads,
      newInRange: newLeadsInRange,
      pendingFollowups,
      overdueFollowups,
      conversions: wonDealsInRange,
      conversionRate,
    },
    activityInRange: {
      calls: callsInRange,
      sms: smsInRange,
      emails: emailsInRange,
      tasksDue: tasksDueToday,
      overdueTasks: overdueFollowups,
      newLeads: newLeadsInRange,
    },
  };
};

// ─── Report Catalog ─────────────────────────────────────────────────────────────

export const callDispositionReport = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);
  const calls = await prisma.call.findMany({
    where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
    include: { disposition: { select: { name: true, category: true } } },
  });

  const byDisposition: Record<string, { category: string; count: number }> = {};
  for (const c of calls) {
    const key = c.disposition?.name ?? 'Not Set';
    if (!byDisposition[key]) byDisposition[key] = { category: c.disposition?.category ?? 'Unclassified', count: 0 };
    byDisposition[key].count++;
  }

  return {
    period: { from: range.from, to: range.to },
    totalCalls: calls.length,
    connected: calls.filter((c) => c.status === 'COMPLETED').length,
    dispositions: Object.entries(byDisposition).map(([name, d]) => ({ name, ...d })),
  };
};

export const smsReport = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);
  const where = { tenantId, channel: 'SMS' as const, createdAt: { gte: range.from, lte: range.to } };
  const [total, sent, delivered, failed, byAgent] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.count({ where: { ...where, status: 'SENT' } }),
    prisma.message.count({ where: { ...where, status: 'DELIVERED' } }),
    prisma.message.count({ where: { ...where, status: 'FAILED' } }),
    prisma.message.groupBy({ by: ['agentId'], where: { ...where, agentId: { not: null } }, _count: true }),
  ]);
  return { period: { from: range.from, to: range.to }, total, sent, delivered, failed, byAgent };
};

export const emailReport = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);
  const where = { tenantId, channel: 'EMAIL' as const, createdAt: { gte: range.from, lte: range.to } };
  const [total, sent, delivered, failed] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.count({ where: { ...where, status: 'SENT' } }),
    prisma.message.count({ where: { ...where, status: 'DELIVERED' } }),
    prisma.message.count({ where: { ...where, status: 'FAILED' } }),
  ]);
  return {
    period: { from: range.from, to: range.to },
    total, sent, delivered, failed,
    // Open/click tracking isn't wired to a provider webhook yet — surfaced as 0 rather than fabricated.
    openRate: 0, clickRate: 0,
  };
};

export const followUpReport = async (tenantId: string) => {
  const now = new Date();
  const [pending, completed, overdue, dueToday] = await Promise.all([
    prisma.task.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.task.count({ where: { tenantId, status: 'COMPLETED' } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING', dueDate: { lt: now } } }),
    prisma.task.count({ where: { tenantId, status: 'PENDING', dueDate: { gte: new Date(now.toDateString()), lt: new Date(now.getTime() + 86400000) } } }),
  ]);

  const last7Tasks = await prisma.task.findMany({
    where: { tenantId, dueDate: { gte: new Date(now.getTime() - 7 * 86400000) } },
    select: { dueDate: true },
  });
  const byDay: Record<string, number> = {};
  for (const t of last7Tasks) {
    const day = t.dueDate.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }

  return {
    pending, completed, overdue, dueToday,
    dailySummary: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
  };
};

export const loginActivityReport = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);
  const logs = await prisma.auditLog.findMany({
    where: { tenantId, action: 'LOGIN', createdAt: { gte: range.from, lte: range.to } },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return {
    period: { from: range.from, to: range.to },
    logins: logs.map((l) => ({ userId: l.userId, name: l.user ? `${l.user.firstName} ${l.user.lastName ?? ''}`.trim() : 'Unknown', email: l.user?.email, at: l.createdAt, ipAddress: l.ipAddress })),
  };
};

export const leadStageReport = async (tenantId: string) => {
  const grouped = await prisma.contact.groupBy({ by: ['status'], where: { tenantId }, _count: true });
  return { stages: grouped.map((g) => ({ stage: g.status, count: g._count })) };
};

export const importLogsReport = async (tenantId: string) => {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId, action: 'CREATE', resourceId: 'bulk-import' },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return {
    imports: logs.map((l) => ({
      resource: l.resource,
      importedCount: (l.after as any)?.count ?? 0,
      by: l.user ? `${l.user.firstName} ${l.user.lastName ?? ''}`.trim() : 'Unknown',
      at: l.createdAt,
    })),
  };
};

export const agentPerformanceReport = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);
  const agents = await prisma.user.findMany({ where: { tenantId, role: { in: ['AGENT', 'MANAGER'] }, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true } });

  const results = await Promise.all(agents.map(async (a) => {
    const [calls, connectedCalls, messages, dealsWon, talkTime] = await Promise.all([
      prisma.call.count({ where: { tenantId, agentId: a.id, createdAt: { gte: range.from, lte: range.to } } }),
      prisma.call.count({ where: { tenantId, agentId: a.id, status: 'COMPLETED', createdAt: { gte: range.from, lte: range.to } } }),
      prisma.message.count({ where: { tenantId, agentId: a.id, createdAt: { gte: range.from, lte: range.to } } }),
      prisma.deal.count({ where: { tenantId, assignedToId: a.id, isWon: true, closedAt: { gte: range.from, lte: range.to } } }),
      prisma.call.aggregate({ where: { tenantId, agentId: a.id, createdAt: { gte: range.from, lte: range.to } }, _sum: { duration: true } }),
    ]);
    return {
      agentId: a.id,
      name: `${a.firstName} ${a.lastName ?? ''}`.trim(),
      calls, connectedCalls, messages, dealsWon,
      talkTimeSeconds: talkTime._sum.duration ?? 0,
    };
  }));

  return { period: { from: range.from, to: range.to }, agents: results };
};

export const campaignPerformanceReport = async (tenantId: string) => {
  const campaigns = await prisma.campaign.findMany({ where: { tenantId }, include: { _count: { select: { contacts: true } } } });
  const results = await Promise.all(campaigns.map(async (c) => {
    const [converted, lost] = await Promise.all([
      prisma.contact.count({ where: { tenantId, campaignId: c.id, status: 'CUSTOMER' } }),
      prisma.contact.count({ where: { tenantId, campaignId: c.id, status: { in: ['CHURNED', 'BLOCKED'] } } }),
    ]);
    const leads = c._count.contacts;
    return {
      campaignId: c.id,
      name: c.name,
      leads,
      converted,
      lost,
      conversionRate: leads > 0 ? Math.round((converted / leads) * 100) : 0,
    };
  }));
  return { campaigns: results };
};

export const leadSourceReport = async (tenantId: string) => {
  const grouped = await prisma.contact.groupBy({ by: ['source'], where: { tenantId }, _count: true });
  return { sources: grouped.map((g) => ({ source: g.source ?? 'Unknown', count: g._count })) };
};

export const pipelineFunnelReport = async (tenantId: string) => {
  const stages = await prisma.dealStage.findMany({ where: { tenantId }, orderBy: { order: 'asc' } });
  const counts = await Promise.all(stages.map((s) => prisma.deal.count({ where: { tenantId, stageId: s.id } })));

  let prev: number | null = null;
  const funnel = stages.map((s, i) => {
    const count = counts[i];
    const dropOff = prev !== null ? prev - count : 0;
    prev = count;
    return { stage: s.name, count, dropOff };
  });
  return { funnel };
};

export const callReport = async (tenantId: string, view: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);
  const calls = await prisma.call.findMany({
    where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
    include: { agent: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (view === 'hourly') {
    const byHour: Record<number, number> = {};
    for (const c of calls) {
      const hour = new Date(c.createdAt).getHours();
      byHour[hour] = (byHour[hour] ?? 0) + 1;
    }
    return { view: 'hourly', hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHour[h] ?? 0 })) };
  }

  const byAgent: Record<string, any> = {};
  for (const c of calls) {
    const key = c.agent ? `${c.agent.firstName} ${c.agent.lastName ?? ''}`.trim() : 'Unassigned';
    if (!byAgent[key]) {
      byAgent[key] = { agent: key, total: 0, connected: 0, notConnected: 0, outConnected: 0, inConnected: 0, unanswered: 0, totalDuration: 0 };
    }
    const row = byAgent[key];
    row.total++;
    const connected = c.status === 'COMPLETED';
    if (connected) row.connected++; else row.notConnected++;
    if (connected && c.direction === 'OUTBOUND') row.outConnected++;
    if (connected && c.direction === 'INBOUND') row.inConnected++;
    if (c.status === 'NO_ANSWER') row.unanswered++;
    row.totalDuration += c.duration ?? 0;
  }

  return {
    view: 'daily',
    rows: Object.values(byAgent).map((r: any) => ({ ...r, avgDuration: r.total > 0 ? Math.round(r.totalDuration / r.total) : 0 })),
  };
};

export const campaignCallLogsReport = async (tenantId: string, campaignId?: string) => {
  const calls = await prisma.call.findMany({
    where: {
      tenantId,
      contact: campaignId ? { campaignId } : { campaignId: { not: null } },
    },
    include: {
      contact: { select: { name: true, campaign: { select: { id: true, name: true } } } },
      agent: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return {
    calls: calls.map((c) => ({
      id: c.id,
      campaign: c.contact?.campaign?.name ?? '—',
      contact: c.contact?.name ?? '—',
      agent: c.agent ? `${c.agent.firstName} ${c.agent.lastName ?? ''}`.trim() : '—',
      status: c.status,
      duration: c.duration,
      recordingUrl: c.recordingUrl,
      createdAt: c.createdAt,
    })),
  };
};

export const breakReport = async (tenantId: string, from?: string, to?: string) => {
  const range = parseDateRange(from, to);
  const logs = await prisma.agentBreakLog.findMany({
    where: { tenantId, startedAt: { gte: range.from, lte: range.to } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const byAgent: Record<string, { agent: string; totalMinutes: number; breaks: number; byLabel: Record<string, number> }> = {};
  for (const l of logs) {
    const key = `${l.user.firstName} ${l.user.lastName ?? ''}`.trim();
    if (!byAgent[key]) byAgent[key] = { agent: key, totalMinutes: 0, breaks: 0, byLabel: {} };
    const endedAt = l.endedAt ?? new Date();
    const minutes = Math.round((endedAt.getTime() - l.startedAt.getTime()) / 60000);
    byAgent[key].totalMinutes += minutes;
    byAgent[key].breaks++;
    byAgent[key].byLabel[l.label] = (byAgent[key].byLabel[l.label] ?? 0) + minutes;
  }

  return { period: { from: range.from, to: range.to }, agents: Object.values(byAgent) };
};
