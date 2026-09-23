import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import type { SaveEngagementFormInput } from './engagement-forms.types';

export const list = (tenantId: string) =>
  prisma.engagementForm.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, include: { campaign: { select: { id: true, name: true } } } });

export const getById = async (tenantId: string, id: string) => {
  const form = await prisma.engagementForm.findFirst({ where: { id, tenantId } });
  if (!form) throw new AppError(404, 'NOT_FOUND', 'Engagement form not found');
  return form;
};

// The form to use for a lead: its campaign's own form, else the tenant-wide default
// (the row with campaignId = null), else null (nothing configured yet).
export const resolve = async (tenantId: string, campaignId?: string | null) => {
  if (campaignId) {
    const own = await prisma.engagementForm.findFirst({ where: { tenantId, campaignId } });
    if (own) return own;
  }
  return prisma.engagementForm.findFirst({ where: { tenantId, campaignId: null }, orderBy: { updatedAt: 'desc' } });
};

// One form per campaign (or one tenant default when campaignId is null) — saving again
// for the same target overwrites it rather than creating a duplicate.
export const save = async (tenantId: string, userId: string, id: string | undefined, input: SaveEngagementFormInput) => {
  if (id) {
    const existing = await prisma.engagementForm.findFirst({ where: { id, tenantId } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Engagement form not found');
    return prisma.engagementForm.update({
      where: { id },
      data: { name: input.name, campaignId: input.campaignId ?? null, schema: input.schema as any },
    });
  }

  const target = await prisma.engagementForm.findFirst({ where: { tenantId, campaignId: input.campaignId ?? null } });
  if (target) {
    return prisma.engagementForm.update({
      where: { id: target.id },
      data: { name: input.name, schema: input.schema as any },
    });
  }
  return prisma.engagementForm.create({
    data: { tenantId, createdById: userId, name: input.name, campaignId: input.campaignId ?? null, schema: input.schema as any },
  });
};

export const remove = async (tenantId: string, id: string) => {
  const existing = await prisma.engagementForm.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Engagement form not found');
  await prisma.engagementForm.delete({ where: { id } });
};
