import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreateSiteVisitInput, UpdateSiteVisitInput } from './real-estate.types';
import * as stageService from './real-estate-stage.service';

const includeRelations = {
  contact: { select: { id: true, name: true, phone: true } },
  project: { select: { id: true, name: true, latitude: true, longitude: true, geofenceMeters: true } },
  unit: { select: { id: true, unitNumber: true } },
  agent: { select: { id: true, firstName: true, lastName: true } },
  partner: { select: { id: true, name: true } },
};

const ACTIVE_STATUSES = ['ON_THE_WAY', 'AT_SITE', 'VISITING', 'RETURNING'] as const;

const dateRangeWhere = (req: Request) => {
  const { from, to } = req.query as Record<string, string>;
  if (!from && !to) return undefined;
  const range: any = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return range;
};

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status, projectId, agentId, contactId } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (projectId) where.projectId = projectId;
  if (agentId) where.agentId = agentId;
  if (contactId) where.contactId = contactId;
  const scheduledAt = dateRangeWhere(req);
  if (scheduledAt) where.scheduledAt = scheduledAt;

  const [siteVisits, total] = await Promise.all([
    prisma.siteVisit.findMany({ where, skip, take: limit, orderBy: { scheduledAt: 'desc' }, include: includeRelations }),
    prisma.siteVisit.count({ where }),
  ]);

  return { siteVisits, meta: paginationMeta(total, page, limit) };
};

export const stats = async (tenantId: string, req: Request) => {
  const { projectId, agentId } = req.query as Record<string, string>;
  const where: any = { tenantId };
  if (projectId) where.projectId = projectId;
  if (agentId) where.agentId = agentId;
  const scheduledAt = dateRangeWhere(req);
  if (scheduledAt) where.scheduledAt = scheduledAt;

  const visits = await prisma.siteVisit.findMany({
    where,
    select: {
      status: true, travelMinutes: true, visitMinutes: true,
      agentId: true, agent: { select: { id: true, firstName: true, lastName: true } },
      projectId: true, project: { select: { id: true, name: true } },
      interestLevel: true, rating: true,
    },
  });

  const travelSamples = visits.filter((v) => v.travelMinutes != null).map((v) => v.travelMinutes!);
  const visitSamples = visits.filter((v) => v.visitMinutes != null).map((v) => v.visitMinutes!);
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0);

  const byAgent = new Map<string, { agentId: string; name: string; total: number; completed: number; noShow: number }>();
  for (const v of visits) {
    if (!v.agentId || !v.agent) continue;
    const key = v.agentId;
    if (!byAgent.has(key)) {
      byAgent.set(key, { agentId: key, name: `${v.agent.firstName} ${v.agent.lastName ?? ''}`.trim(), total: 0, completed: 0, noShow: 0 });
    }
    const rec = byAgent.get(key)!;
    rec.total += 1;
    if (v.status === 'COMPLETED' || v.status === 'VISIT_DONE') rec.completed += 1;
    if (v.status === 'NO_SHOW') rec.noShow += 1;
  }

  const byProject = new Map<string, { projectId: string; name: string; total: number; completed: number }>();
  for (const v of visits) {
    if (!v.projectId || !v.project) continue;
    const key = v.projectId;
    if (!byProject.has(key)) {
      byProject.set(key, { projectId: key, name: v.project.name, total: 0, completed: 0 });
    }
    const rec = byProject.get(key)!;
    rec.total += 1;
    if (v.status === 'COMPLETED' || v.status === 'VISIT_DONE') rec.completed += 1;
  }

  return {
    total: visits.length,
    scheduled: visits.filter((v) => v.status === 'SCHEDULED').length,
    active: visits.filter((v) => (ACTIVE_STATUSES as readonly string[]).includes(v.status)).length,
    completed: visits.filter((v) => v.status === 'COMPLETED' || v.status === 'VISIT_DONE').length,
    noShow: visits.filter((v) => v.status === 'NO_SHOW').length,
    cancelled: visits.filter((v) => v.status === 'CANCELLED').length,
    avgTravelMinutes: avg(travelSamples),
    avgVisitMinutes: avg(visitSamples),
    agentPerformance: Array.from(byAgent.values()).sort((a, b) => b.completed - a.completed),
    projectPerformance: Array.from(byProject.values()).sort((a, b) => b.total - a.total),
  };
};

export const getById = async (tenantId: string, id: string) => {
  const siteVisit = await prisma.siteVisit.findFirst({ where: { id, tenantId }, include: includeRelations });
  if (!siteVisit) throw new AppError(404, 'NOT_FOUND', 'Site visit not found');
  return siteVisit;
};

export const create = async (tenantId: string, userId: string, input: CreateSiteVisitInput) => {
  const siteVisit = await prisma.siteVisit.create({
    data: {
      tenantId,
      contactId: input.contactId,
      projectId: input.projectId,
      unitId: input.unitId || undefined,
      agentId: input.agentId || undefined,
      partnerId: input.partnerId || undefined,
      scheduledAt: new Date(input.scheduledAt),
      status: input.status,
      travelMinutes: input.travelMinutes,
      visitMinutes: input.visitMinutes,
      interestLevel: input.interestLevel || undefined,
      rating: input.rating,
      feedback: input.feedback,
    },
    include: includeRelations,
  });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 're_site_visits', resourceId: siteVisit.id, after: siteVisit as any },
  });

  await stageService.advanceStage(tenantId, siteVisit.contactId, 'VISIT_SCHEDULED', 'SITE_VISIT_CREATED');

  return siteVisit;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdateSiteVisitInput) => {
  const existing = await prisma.siteVisit.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Site visit not found');

  const data: any = { ...input };
  if (input.scheduledAt) data.scheduledAt = new Date(input.scheduledAt);
  if ('unitId' in data && !data.unitId) data.unitId = null;
  if ('agentId' in data && !data.agentId) data.agentId = null;
  if ('partnerId' in data && !data.partnerId) data.partnerId = null;
  if (input.status && input.status !== existing.status) data.statusAt = new Date();

  const updated = await prisma.siteVisit.update({ where: { id }, data, include: includeRelations });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 're_site_visits', resourceId: id, before: existing as any, after: updated as any },
  });

  if (input.status === 'VISIT_DONE' && existing.status !== 'VISIT_DONE') {
    await stageService.advanceStage(tenantId, existing.contactId, 'VISIT_DONE', 'SITE_VISIT_VISIT_DONE');
  }

  return updated;
};

export const updateStatus = async (tenantId: string, userId: string, id: string, status: string) => {
  return update(tenantId, userId, id, { status: status as any });
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.siteVisit.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Site visit not found');

  await prisma.siteVisit.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 're_site_visits', resourceId: id, before: existing as any },
  });
};
