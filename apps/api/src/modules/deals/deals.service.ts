import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreateDealInput, UpdateDealInput, CreateStageInput, UpdateStageInput, ReorderStagesInput } from './deals.types';

// ── Pipelines ────────────────────────────────────────────────────────────────

export const listPipelines = async (tenantId: string) => {
  const pipelines = await prisma.pipeline.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  if (pipelines.length > 0) return pipelines;
  const created = await prisma.pipeline.create({ data: { tenantId, name: 'Sales Pipeline', isDefault: true } });
  return [created];
};

// ── Stage management ───────────────────────────────────────────────────────────

export const createStage = async (tenantId: string, input: CreateStageInput) => {
  const last = await prisma.dealStage.findFirst({
    where: { tenantId },
    orderBy: { order: 'desc' },
  });
  const nextOrder = (last?.order ?? 0) + 1;
  return prisma.dealStage.create({
    data: { tenantId, name: input.name, color: input.color ?? '#94A3B8', order: nextOrder },
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
  const stages = await prisma.dealStage.findMany({ where: { tenantId } });
  const stageIds = new Set(stages.map((s) => s.id));

  for (const id of input.orderedIds) {
    if (!stageIds.has(id)) throw new AppError(400, 'INVALID_STAGE', `Stage ${id} not found`);
  }

  await prisma.$transaction(
    input.orderedIds.map((id, idx) =>
      prisma.dealStage.update({ where: { id }, data: { order: idx + 1 } }),
    ),
  );

  return prisma.dealStage.findMany({ where: { tenantId }, orderBy: { order: 'asc' } });
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

export const getStages = async (tenantId: string) => {
  return prisma.dealStage.findMany({ where: { tenantId }, orderBy: { order: 'asc' } });
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
