import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { buildWhere, describeFilters, orderByFor, statusWhere, SYSTEM_VIEWS } from './lead-views.filters';
import type { CreateLeadViewInput, LeadViewFilters, UpdateLeadViewInput } from './lead-views.types';

// Resolves any view id (system:* or a custom row) to a Prisma where + orderBy that the
// existing contacts queries can use directly.
export const resolveView = async (tenantId: string, viewId: string) => {
  const system = SYSTEM_VIEWS.find((v) => v.id === viewId);
  if (system) {
    const where = system.status ? { tenantId, ...statusWhere(system.status) } : { tenantId };
    return { name: system.name, where, orderBy: orderByFor('newest') };
  }
  const view = await prisma.leadView.findFirst({ where: { id: viewId, tenantId } });
  if (!view) throw new AppError(404, 'NOT_FOUND', 'View not found');
  const filters = view.filters as LeadViewFilters;
  return { name: view.name, where: buildWhere(tenantId, filters), orderBy: orderByFor(filters.sortOrder) };
};

export const list = async (tenantId: string) => {
  const custom = await prisma.leadView.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });

  const system = await Promise.all(
    SYSTEM_VIEWS.map(async (v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      isSystemDefault: true,
      filters: null,
      filtersSummary: null,
      leadCount: await prisma.contact.count({
        where: v.status ? { tenantId, ...statusWhere(v.status) } : { tenantId },
      }),
    })),
  );

  const customViews = await Promise.all(
    custom.map(async (v) => {
      const filters = v.filters as LeadViewFilters;
      return {
        id: v.id,
        name: v.name,
        description: v.description,
        isSystemDefault: false,
        filters,
        filtersSummary: describeFilters(filters),
        leadCount: await prisma.contact.count({ where: buildWhere(tenantId, filters) }),
      };
    }),
  );

  return [...system, ...customViews];
};

export const create = (tenantId: string, userId: string, input: CreateLeadViewInput) =>
  prisma.leadView.create({
    data: { tenantId, createdById: userId, name: input.name, filters: input.filters as any },
  });

const getCustom = async (tenantId: string, id: string) => {
  if (id.startsWith('system:')) throw new AppError(403, 'FORBIDDEN', 'System views cannot be changed');
  const view = await prisma.leadView.findFirst({ where: { id, tenantId } });
  if (!view) throw new AppError(404, 'NOT_FOUND', 'View not found');
  return view;
};

export const update = async (tenantId: string, id: string, input: UpdateLeadViewInput) => {
  await getCustom(tenantId, id);
  return prisma.leadView.update({
    where: { id },
    data: { ...(input.name ? { name: input.name } : {}), ...(input.filters ? { filters: input.filters as any } : {}) },
  });
};

export const remove = async (tenantId: string, id: string) => {
  await getCustom(tenantId, id);
  await prisma.leadView.delete({ where: { id } });
};

// Ordered lead ids for a calling session queue.
export const leadQueue = async (tenantId: string, viewId: string) => {
  const { where, orderBy, name } = await resolveView(tenantId, viewId);
  const leads = await prisma.contact.findMany({
    where: { AND: [where, { status: { not: 'BLOCKED' } }] },
    orderBy,
    take: 500,
    select: { id: true },
  });
  return { viewName: name, leadIds: leads.map((l) => l.id) };
};
