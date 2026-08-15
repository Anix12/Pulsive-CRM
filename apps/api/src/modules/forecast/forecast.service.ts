import prisma from '@/db/client';

const DAY_MS = 86400000;

// Transparent stage-level funnel math — no ML, every number here is derived from
// visible current pipeline state and simple historical averages.
export const salesForecast = async (tenantId: string) => {
  const now = new Date();

  const [openDeals, closedDeals, stages, last30DaysContacts, last30DaysLost] = await Promise.all([
    prisma.deal.findMany({
      where: { tenantId, isWon: null },
      select: { value: true, expectedCloseDate: true, stage: { select: { name: true, order: true, probability: true } } },
    }),
    prisma.deal.findMany({
      where: { tenantId, isWon: { not: null }, closedAt: { not: null } },
      select: { isWon: true, value: true, createdAt: true, closedAt: true },
    }),
    prisma.dealStage.findMany({ where: { tenantId }, orderBy: { order: 'asc' } }),
    prisma.contact.count({ where: { tenantId, createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } } }),
    prisma.contact.count({ where: { tenantId, status: { in: ['CHURNED', 'BLOCKED'] }, updatedAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } } }),
  ]);

  const won = closedDeals.filter((d) => d.isWon);
  const lost = closedDeals.filter((d) => !d.isWon);
  const winLossRatio = lost.length > 0 ? Number((won.length / lost.length).toFixed(2)) : won.length;

  const avgCloseTimeDays = won.length > 0
    ? Math.round(won.reduce((sum, d) => sum + (d.closedAt!.getTime() - d.createdAt.getTime()) / DAY_MS, 0) / won.length)
    : 0;

  const totalPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
  const dailyLeadRate = last30DaysContacts / 30;
  const dailyLostRate = last30DaysLost / 30;

  const windows = [
    { key: '7d', label: '7 days', days: 7 },
    { key: '15d', label: '15 days', days: 15 },
    { key: '30d', label: '30 days', days: 30 },
    { key: '6m', label: '6 months', days: 182 },
  ];

  const forecastWindows = windows.map((w) => {
    const cutoff = new Date(now.getTime() + w.days * DAY_MS);
    const dealsInWindow = openDeals.filter((d) => d.expectedCloseDate && d.expectedCloseDate <= cutoff);
    const expectedConversions = Math.round(
      dealsInWindow.reduce((sum, d) => sum + (d.stage.probability / 100), 0),
    );
    return {
      key: w.key,
      label: w.label,
      expectedConversions,
      expectedValue: dealsInWindow.reduce((sum, d) => sum + Number(d.value ?? 0) * (d.stage.probability / 100), 0),
      projectedLeadsGained: Math.round(dailyLeadRate * w.days),
      projectedLeadsLost: Math.round(dailyLostRate * w.days),
    };
  });

  // Stage Conversion Analysis: live funnel of currently open deals across stages
  const stageCounts = stages.map((s) => openDeals.filter((d) => d.stage.name === s.name).length);
  const firstCount = stageCounts[0] || 1;
  const stageConversion = stages.map((s, i) => ({
    stage: s.name,
    count: stageCounts[i],
    conversionRate: Math.round((stageCounts[i] / firstCount) * 100),
  }));

  return {
    forecastWindows,
    stageConversion,
    winLossRatio,
    won: won.length,
    lost: lost.length,
    avgCloseTimeDays,
    totalPipelineValue,
  };
};
