import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreateDealInput, UpdateDealInput, CreateStageInput, UpdateStageInput, ReorderStagesInput } from './deals.types';

// ── Pipelines ────────────────────────────────────────────────────────────────

export const listPipelines = async (tenantId: string) => {
  const pipelines = await prisma.pipeline.findMany({
    where: { tenantId },
    include: { stages: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  if (pipelines.length > 0) return pipelines;
  const created = await prisma.pipeline.create({ data: { tenantId, name: 'Sales Pipeline', isDefault: true } });
  return [{ ...created, stages: [] }];
};

const ensureDefaultPipeline = async (tenantId: string) => {
  const existing = await prisma.pipeline.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.pipeline.create({ data: { tenantId, name: 'Sales Pipeline', isDefault: true } });
};

// ── Stage management ───────────────────────────────────────────────────────────
// Stages belong to a Pipeline; ordering (DealStage.order) is unique per
// (tenantId, pipelineId), so each pipeline has its own independent 1..n order.

export const createStage = async (tenantId: string, input: CreateStageInput) => {
  const pipelineId = input.pipelineId ?? (await ensureDefaultPipeline(tenantId)).id;
  const last = await prisma.dealStage.findFirst({
    where: { tenantId, pipelineId },
    orderBy: { order: 'desc' },
  });
  const nextOrder = (last?.order ?? 0) + 1;
  return prisma.dealStage.create({
    data: { tenantId, pipelineId, name: input.name, color: input.color ?? '#94A3B8', order: nextOrder },
  });
};

export const updateStage = async (tenantId: string, id: string, input: UpdateStageInput) => {
  const existing = await prisma.dealStage.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Stage not found');
  return prisma.dealStage.update({ where: { id }, data: input });
};

export const deleteStage = async (tenantId: string, id: string) => {
  const existing = await prisma.dealStage.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Stage not found');

  const dealCount = await prisma.deal.count({ where: { stageId: id } });
  if (dealCount > 0) {
    throw new AppError(409, 'STAGE_HAS_DEALS', `Cannot delete — ${dealCount} deal${dealCount > 1 ? 's are' : ' is'} in this stage. Move them first.`);
  }

  await prisma.dealStage.delete({ where: { id } });
};

export const reorderStages = async (tenantId: string, input: ReorderStagesInput) => {
  const stages = await prisma.dealStage.findMany({ where: { tenantId, pipelineId: input.pipelineId } });
  const stageIds = new Set(stages.map((s) => s.id));

  for (const id of input.orderedIds) {
    if (!stageIds.has(id)) throw new AppError(400, 'INVALID_STAGE', `Stage ${id} not found in this pipeline`);
  }

  // Two-phase update: the target order values almost always collide with an
  // existing row's current order mid-transaction (e.g. swapping two adjacent
  // stages), which trips the (tenantId, pipelineId, order) unique constraint.
  // Moving every row to a distinct negative placeholder first, then to its
  // real order, avoids any such collision. Uses an interactive transaction
  // so the two phases are guaranteed to run in order.
  await prisma.$transaction(async (tx) => {
    for (const [idx, id] of input.orderedIds.entries()) {
      await tx.dealStage.update({ where: { id }, data: { order: -(idx + 1) } });
    }
    for (const [idx, id] of input.orderedIds.entries()) {
      await tx.dealStage.update({ where: { id }, data: { order: idx + 1 } });
    }
  });

  return prisma.dealStage.findMany({ where: { tenantId, pipelineId: input.pipelineId }, orderBy: { order: 'asc' } });
};

// ── Deal CRUD ──────────────────────────────────────────────────────────────────

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { stageId, assignedToId, contactId } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (stageId) where.stageId = stageId;
  if (assignedToId) where.assignedToId = assignedToId;
  if (contactId) where.contactId = contactId;

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { stage: true, contact: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.deal.count({ where }),
  ]);

  return { deals, meta: paginationMeta(total, page, limit) };
};

export const getStages = async (tenantId: string, pipelineId?: string) => {
  return prisma.dealStage.findMany({
    where: { tenantId, ...(pipelineId ? { pipelineId } : {}) },
    orderBy: { order: 'asc' },
  });
};

// ── Analytics ──────────────────────────────────────────────────────────────────
// All-time, unfiltered by design — the Deals/Pipeline page has no date-range concept
// today (its Kanban board already fetches every deal, uncapped by date), so scoping
// this to "this month" (like reports/business-performance defaults to) would silently
// disagree with what the same page's Kanban board shows. See PHASE_3 report.

const num = (d: unknown) => Number(d ?? 0);

export const analytics = async (tenantId: string) => {
  const [stages, byStageRaw, byOutcomeRaw, byAgentRaw, wonForAvg] = await Promise.all([
    prisma.dealStage.findMany({ where: { tenantId }, orderBy: { order: 'asc' } }),
    prisma.deal.groupBy({ by: ['stageId'], where: { tenantId }, _count: { _all: true }, _sum: { value: true } }),
    prisma.deal.groupBy({ by: ['isWon'], where: { tenantId }, _count: { _all: true }, _sum: { value: true } }),
    prisma.deal.groupBy({ by: ['assignedToId'], where: { tenantId, isWon: true }, _count: { _all: true }, _sum: { value: true } }),
    prisma.deal.aggregate({ where: { tenantId, isWon: true }, _avg: { value: true } }),
  ]);

  const pipelineByStage = stages.map((stage) => {
    const g = byStageRaw.find((b) => b.stageId === stage.id);
    return {
      stageId: stage.id,
      stage: stage.name,
      order: stage.order,
      color: stage.color,
      count: g?._count._all ?? 0,
      value: num(g?._sum.value),
    };
  });

  const outcomeOf = (isWon: boolean | null) => {
    const g = byOutcomeRaw.find((b) => b.isWon === isWon);
    return { count: g?._count._all ?? 0, value: num(g?._sum.value) };
  };
  const outcomes = { won: outcomeOf(true), lost: outcomeOf(false), open: outcomeOf(null) };

  const agentIds = byAgentRaw.map((b) => b.assignedToId).filter((id): id is string => !!id);
  const agents = agentIds.length
    ? await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];
  const byAgent = byAgentRaw
    .filter((b) => b.assignedToId)
    .map((b) => {
      const agent = agents.find((a) => a.id === b.assignedToId);
      return {
        agentId: b.assignedToId!,
        name: agent ? `${agent.firstName} ${agent.lastName ?? ''}`.trim() : 'Unknown',
        count: b._count._all,
        value: num(b._sum.value),
      };
    })
    .sort((a, b) => b.value - a.value);

  // bySource needs a relation join (Contact.source) that groupBy can't express directly,
  // so it's the one facet computed from a lightweight, backend-side reduce rather than a
  // native Prisma aggregate — still never ships raw deal records to the browser.
  const dealsForSource = await prisma.deal.findMany({
    where: { tenantId },
    select: { value: true, contact: { select: { source: true } } },
  });
  const sourceMap = new Map<string, { count: number; value: number }>();
  for (const d of dealsForSource) {
    const key = d.contact?.source ?? 'Unknown';
    const entry = sourceMap.get(key) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += num(d.value);
    sourceMap.set(key, entry);
  }
  const bySource = Array.from(sourceMap.entries())
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.value - a.value);

  // Value over time: trailing 6 calendar months of *won* deal value, bucketed by the
  // month each deal closed in — a month a deal actually closed in has real revenue;
  // a month with none shows a real zero, not a gap.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  const wonDeals = await prisma.deal.findMany({
    where: { tenantId, isWon: true, closedAt: { gte: sixMonthsAgo } },
    select: { value: true, closedAt: true },
  });
  const monthBuckets: { period: string; label: string; value: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    monthBuckets.push({
      period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      value: 0,
      count: 0,
    });
  }
  for (const deal of wonDeals) {
    if (!deal.closedAt) continue;
    const period = `${deal.closedAt.getFullYear()}-${String(deal.closedAt.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthBuckets.find((b) => b.period === period);
    if (bucket) { bucket.value += num(deal.value); bucket.count += 1; }
  }

  // Aging: open deals only (isWon is null — neither won nor lost yet), bucketed by
  // days since creation. Buckets are fixed, meaningful ranges, not derived from data.
  const openDeals = await prisma.deal.findMany({
    where: { tenantId, isWon: null },
    select: { createdAt: true },
  });
  const now = Date.now();
  const AGING_BUCKETS = [
    { bucket: '0-7 days', max: 7 },
    { bucket: '8-30 days', max: 30 },
    { bucket: '31-60 days', max: 60 },
    { bucket: '60+ days', max: Infinity },
  ];
  const aging = AGING_BUCKETS.map((b) => ({ bucket: b.bucket, count: 0 }));
  for (const deal of openDeals) {
    const ageDays = (now - deal.createdAt.getTime()) / 86_400_000;
    const idx = AGING_BUCKETS.findIndex((b) => ageDays <= b.max);
    aging[idx === -1 ? aging.length - 1 : idx].count += 1;
  }

  return {
    pipelineByStage,
    outcomes,
    avgWonValue: num(wonForAvg._avg.value),
    byAgent,
    bySource,
    valueOverTime: monthBuckets,
    aging,
  };
};

export const getById = async (tenantId: string, id: string) => {
  const deal = await prisma.deal.findFirst({
    where: { id, tenantId },
    include: {
      stage: true,
      contact: true,
      activities: { orderBy: { occurredAt: 'desc' }, take: 20 },
    },
  });
  if (!deal) throw new AppError(404, 'NOT_FOUND', 'Deal not found');
  return deal;
};

export const create = async (tenantId: string, userId: string, input: CreateDealInput) => {
  const deal = await prisma.deal.create({
    data: { tenantId, ...input },
    include: { stage: true },
  });

  await Promise.all([
    prisma.activity.create({
      data: {
        tenantId,
        dealId: deal.id,
        contactId: deal.contactId,
        userId,
        type: 'DEAL_CREATED',
        subject: `Deal "${deal.title}" created`,
      },
    }),
    prisma.auditLog.create({
      data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 'deals', resourceId: deal.id, after: deal as any },
    }),
  ]);

  return deal;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdateDealInput) => {
  const existing = await prisma.deal.findFirst({ where: { id, tenantId }, include: { stage: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Deal not found');

  const data: any = { ...input };
  if (input.isWon !== undefined) data.closedAt = new Date();

  const updated = await prisma.deal.update({ where: { id }, data, include: { stage: true } });

  const activities = [];
  if (input.stageId && input.stageId !== existing.stageId) {
    activities.push(
      prisma.activity.create({
        data: {
          tenantId,
          dealId: id,
          contactId: existing.contactId,
          userId,
          type: 'DEAL_STAGE_CHANGED',
          subject: `Deal moved to ${updated.stage.name}`,
          metadata: { fromStageId: existing.stageId, toStageId: input.stageId },
        },
      }),
    );
  }

  await Promise.all([
    ...activities,
    prisma.auditLog.create({
      data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 'deals', resourceId: id, before: existing as any, after: updated as any },
    }),
  ]);

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.deal.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Deal not found');
  await prisma.deal.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 'deals', resourceId: id, before: existing as any },
  });
};
