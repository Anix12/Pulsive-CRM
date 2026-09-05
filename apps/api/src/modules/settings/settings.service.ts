import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { AUDIT_ACTIONS } from '@/config/constants';
import * as T from './settings.types';

// ── Custom Fields ────────────────────────────────────────────────────────────

export const listCustomFields = async (tenantId: string, entity?: string) => {
  return prisma.customFieldDefinition.findMany({
    where: { tenantId, ...(entity ? { entity: entity as any } : {}) },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
};

export const createCustomField = async (tenantId: string, input: T.CreateCustomFieldInput) => {
  const existing = await prisma.customFieldDefinition.findUnique({
    where: { tenantId_entity_key: { tenantId, entity: input.entity, key: input.key } },
  });
  if (existing) throw new AppError(409, 'ALREADY_EXISTS', 'A field with this key already exists for this entity');
  return prisma.customFieldDefinition.create({ data: { tenantId, ...input } });
};

export const updateCustomField = async (tenantId: string, id: string, input: T.UpdateCustomFieldInput) => {
  const existing = await prisma.customFieldDefinition.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Custom field not found');
  return prisma.customFieldDefinition.update({ where: { id }, data: input });
};

export const deleteCustomField = async (tenantId: string, id: string) => {
  const existing = await prisma.customFieldDefinition.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Custom field not found');
  await prisma.customFieldDefinition.delete({ where: { id } });
};

// ── Scoring Rules ────────────────────────────────────────────────────────────

export const listScoringRules = async (tenantId: string) => {
  return prisma.scoringRule.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
};

const matchesRule = (contact: any, rule: { field: string; operator: string; value: string }) => {
  const parts = rule.field.split('.');
  let raw: any = contact;
  for (const p of parts) {
    if (p === 'customFields') { raw = contact.customFields; continue; }
    raw = raw?.[p];
  }
  if (raw === undefined || raw === null) return false;
  const str = String(raw).toLowerCase();
  const target = rule.value.toLowerCase();
  switch (rule.operator) {
    case 'equals': return str === target;
    case 'contains': return str.includes(target);
    case 'gt': return Number(raw) > Number(rule.value);
    case 'lt': return Number(raw) < Number(rule.value);
    default: return false;
  }
};

// Recalculates every contact's score in the tenant against all active scoring rules.
export const recalculateScores = async (tenantId: string) => {
  const [rules, contacts] = await Promise.all([
    prisma.scoringRule.findMany({ where: { tenantId, isActive: true } }),
    prisma.contact.findMany({ where: { tenantId }, select: { id: true, source: true, status: true, temperature: true, tags: true, customFields: true, score: true } }),
  ]);

  const updates = contacts.map((c) => {
    const score = rules.reduce((sum, rule) => (matchesRule(c, rule) ? sum + rule.points : sum), 0);
    return { id: c.id, score };
  }).filter((u) => {
    const original = contacts.find((c) => c.id === u.id);
    return original && original.score !== u.score;
  });

  if (updates.length > 0) {
    await prisma.$transaction(updates.map((u) => prisma.contact.update({ where: { id: u.id }, data: { score: u.score } })));
  }
  return { recalculated: updates.length };
};

export const createScoringRule = async (tenantId: string, input: T.CreateScoringRuleInput) => {
  const rule = await prisma.scoringRule.create({ data: { tenantId, ...input } });
  await recalculateScores(tenantId);
  return rule;
};

export const updateScoringRule = async (tenantId: string, id: string, input: T.UpdateScoringRuleInput) => {
  const existing = await prisma.scoringRule.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Scoring rule not found');
  const rule = await prisma.scoringRule.update({ where: { id }, data: input });
  await recalculateScores(tenantId);
  return rule;
};

export const deleteScoringRule = async (tenantId: string, id: string) => {
  const existing = await prisma.scoringRule.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Scoring rule not found');
  await prisma.scoringRule.delete({ where: { id } });
  await recalculateScores(tenantId);
};

// ── Pipelines ────────────────────────────────────────────────────────────────

export const listPipelines = async (tenantId: string) => {
  return prisma.pipeline.findMany({
    where: { tenantId },
    include: { stages: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
};

export const createPipeline = async (tenantId: string, input: T.CreatePipelineInput) => {
  return prisma.pipeline.create({ data: { tenantId, ...input } });
};

export const updatePipeline = async (tenantId: string, id: string, input: T.UpdatePipelineInput) => {
  const existing = await prisma.pipeline.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Pipeline not found');
  return prisma.pipeline.update({ where: { id }, data: input });
};

export const deletePipeline = async (tenantId: string, id: string) => {
  const existing = await prisma.pipeline.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Pipeline not found');
  const stageCount = await prisma.dealStage.count({ where: { pipelineId: id } });
  if (stageCount > 0) throw new AppError(409, 'PIPELINE_HAS_STAGES', 'Move or delete stages before deleting the pipeline');
  await prisma.pipeline.delete({ where: { id } });
};

// ── Call Dispositions ────────────────────────────────────────────────────────

export const listCallDispositions = async (tenantId: string) => {
  return prisma.callDisposition.findMany({
    where: { tenantId },
    include: { movesToStage: { select: { id: true, name: true } } },
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  });
};

export const createCallDisposition = async (tenantId: string, input: T.CreateCallDispositionInput) => {
  return prisma.callDisposition.create({ data: { tenantId, ...input } });
};

export const updateCallDisposition = async (tenantId: string, id: string, input: T.UpdateCallDispositionInput) => {
  const existing = await prisma.callDisposition.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Disposition not found');
  return prisma.callDisposition.update({ where: { id }, data: input });
};

export const deleteCallDisposition = async (tenantId: string, id: string) => {
  const existing = await prisma.callDisposition.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Disposition not found');
  await prisma.callDisposition.delete({ where: { id } });
};

// "Copy from Pipeline" — duplicates the tenant's full disposition set, remapped to a new default stage
export const copyDispositions = async (tenantId: string, input: { toStageId: string }) => {
  const existing = await prisma.callDisposition.findMany({ where: { tenantId } });
  if (existing.length === 0) throw new AppError(400, 'NO_DISPOSITIONS', 'No dispositions to copy yet');
  const created = await prisma.$transaction(
    existing.map((d) =>
      prisma.callDisposition.create({
        data: {
          tenantId,
          name: d.name,
          category: d.category,
          order: d.order,
          movesToStageId: input.toStageId,
        },
      }),
    ),
  );
  return created;
};

// ── Report Schedules ─────────────────────────────────────────────────────────

export const listReportSchedules = async (tenantId: string) => {
  return prisma.reportSchedule.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
};

export const createReportSchedule = async (tenantId: string, input: T.CreateReportScheduleInput) => {
  return prisma.reportSchedule.create({ data: { tenantId, ...input } });
};

export const updateReportSchedule = async (tenantId: string, id: string, input: T.UpdateReportScheduleInput) => {
  const existing = await prisma.reportSchedule.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Report schedule not found');
  return prisma.reportSchedule.update({ where: { id }, data: input });
};

export const deleteReportSchedule = async (tenantId: string, id: string) => {
  const existing = await prisma.reportSchedule.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Report schedule not found');
  await prisma.reportSchedule.delete({ where: { id } });
};

// ── Break Windows ────────────────────────────────────────────────────────────

export const listBreakWindows = async (tenantId: string) => {
  return prisma.breakWindow.findMany({ where: { tenantId }, orderBy: { startTime: 'asc' } });
};

export const createBreakWindow = async (tenantId: string, input: T.CreateBreakWindowInput) => {
  return prisma.breakWindow.create({ data: { tenantId, ...input } });
};

export const updateBreakWindow = async (tenantId: string, id: string, input: T.UpdateBreakWindowInput) => {
  const existing = await prisma.breakWindow.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Break window not found');
  return prisma.breakWindow.update({ where: { id }, data: input });
};

export const deleteBreakWindow = async (tenantId: string, id: string) => {
  const existing = await prisma.breakWindow.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Break window not found');
  await prisma.breakWindow.delete({ where: { id } });
};

// ── Roles & Permissions ──────────────────────────────────────────────────────

export const DEFAULT_PERMISSION_MODULES = [
  'leads', 'campaigns', 'workflows', 'tasks', 'templates', 'marketing',
  'whatsappInbox', 'reports', 'applications', 'usersAndRoles', 'integrations', 'settings',
] as const;

const defaultPermissionsForRole = (role: string) => {
  const perms: Record<string, { view: boolean; edit: boolean }> = {};
  for (const mod of DEFAULT_PERMISSION_MODULES) {
    const isAdminModule = mod === 'usersAndRoles' || mod === 'settings' || mod === 'integrations';
    perms[mod] = {
      view: true,
      edit: role === 'ADMIN' ? true : role === 'MANAGER' ? !isAdminModule : mod !== 'usersAndRoles' && !isAdminModule,
    };
  }
  return perms;
};

export const listRolePermissions = async (tenantId: string) => {
  const roles = ['ADMIN', 'MANAGER', 'AGENT'] as const;
  const existing = await prisma.rolePermission.findMany({ where: { tenantId } });
  const byRole = new Map(existing.map((r) => [r.role, r]));

  return roles.map((role) => {
    const row = byRole.get(role);
    return {
      role,
      permissions: (row?.permissions as any) ?? defaultPermissionsForRole(role),
      managerScopedAccess: row?.managerScopedAccess ?? false,
    };
  });
};

export const upsertRolePermission = async (tenantId: string, input: T.UpdateRolePermissionInput) => {
  return prisma.rolePermission.upsert({
    where: { tenantId_role: { tenantId, role: input.role } },
    create: { tenantId, role: input.role, permissions: input.permissions, managerScopedAccess: input.managerScopedAccess ?? false },
    update: { permissions: input.permissions, ...(input.managerScopedAccess !== undefined ? { managerScopedAccess: input.managerScopedAccess } : {}) },
  });
};
