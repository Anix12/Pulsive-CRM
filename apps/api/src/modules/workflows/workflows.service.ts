import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { Request } from 'express';
import { CreateWorkflowInput, UpdateWorkflowInput } from './workflows.types';
import { AUDIT_ACTIONS } from '@/config/constants';

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [workflows, total] = await Promise.all([
    prisma.workflow.findMany({ where: { tenantId }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.workflow.count({ where: { tenantId } }),
  ]);
  return { workflows, meta: paginationMeta(total, page, limit) };
};

export const getById = async (tenantId: string, id: string) => {
  const workflow = await prisma.workflow.findFirst({ where: { id, tenantId } });
  if (!workflow) throw new AppError(404, 'NOT_FOUND', 'Workflow not found');
  return workflow;
};

export const create = async (tenantId: string, userId: string, input: CreateWorkflowInput) => {
  const workflow = await prisma.workflow.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      steps: input.steps,
      isActive: input.isActive ?? false,
    },
  });

  await Promise.all([
    prisma.onboardingProgress.updateMany({
      where: { tenantId, createdFirstWorkflow: false },
      data: { createdFirstWorkflow: true },
    }),
    prisma.auditLog.create({
      data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 'workflows', resourceId: workflow.id, after: workflow as any },
    }),
  ]);

  return workflow;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdateWorkflowInput) => {
  const existing = await prisma.workflow.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Workflow not found');

  const updated = await prisma.workflow.update({ where: { id }, data: input as any });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 'workflows', resourceId: id, before: existing as any, after: updated as any },
  });

  return updated;
};

export const toggle = async (tenantId: string, id: string, isActive: boolean) => {
  const existing = await prisma.workflow.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Workflow not found');
  return prisma.workflow.update({ where: { id }, data: { isActive } });
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.workflow.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Workflow not found');
  await prisma.workflow.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 'workflows', resourceId: id, before: existing as any },
  });
};

export const getExecutions = async (tenantId: string, workflowId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [executions, total] = await Promise.all([
    prisma.workflowExecution.findMany({ where: { workflowId, tenantId }, skip, take: limit, orderBy: { startedAt: 'desc' } }),
    prisma.workflowExecution.count({ where: { workflowId, tenantId } }),
  ]);
  return { executions, meta: paginationMeta(total, page, limit) };
};
