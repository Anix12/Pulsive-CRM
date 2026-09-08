import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { Request } from 'express';
import { UpsertPropertyPreferenceInput } from './real-estate.types';

export const getPreference = async (tenantId: string, contactId: string) => {
  return prisma.propertyPreference.findFirst({ where: { tenantId, contactId } });
};

export const upsertPreference = async (tenantId: string, input: UpsertPropertyPreferenceInput) => {
  const contact = await prisma.contact.findFirst({ where: { id: input.contactId, tenantId } });
  if (!contact) throw new AppError(404, 'NOT_FOUND', 'Contact not found');

  return prisma.propertyPreference.upsert({
    where: { contactId: input.contactId },
    create: { tenantId, ...input },
    update: input,
  });
};

// Matches a contact's stored preferences against available inventory —
// city + unit type must match, and the unit's price must fall within budget.
export const matchesForContact = async (tenantId: string, contactId: string) => {
  const preference = await prisma.propertyPreference.findFirst({ where: { tenantId, contactId } });
  if (!preference) throw new AppError(404, 'NOT_FOUND', 'No property preference set for this contact');

  const where: any = { tenantId, status: 'AVAILABLE' };
  if (preference.preferredType) where.type = preference.preferredType;
  if (preference.preferredCity) where.project = { city: preference.preferredCity };
  if (preference.budgetMin || preference.budgetMax) {
    where.price = {};
    if (preference.budgetMin) where.price.gte = preference.budgetMin;
    if (preference.budgetMax) where.price.lte = preference.budgetMax;
  }

  const units = await prisma.unit.findMany({
    where,
    include: { project: { select: { id: true, name: true, city: true, location: true } } },
    orderBy: { price: 'asc' },
    take: 50,
  });

  return { preference, matches: units };
};

// The reverse direction: given a set of criteria (budget/BHK/location), find which
// leads have a saved preference matching it — used by the "Search Criteria" panel.
export const searchLeads = async (tenantId: string, req: Request) => {
  const { minBudget, maxBudget, bhk, location } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (bhk) where.preferredType = bhk;
  if (location) where.preferredCity = { contains: location, mode: 'insensitive' };
  if (minBudget || maxBudget) {
    // A lead's range [budgetMin, budgetMax] overlaps the searched range.
    if (maxBudget) where.budgetMin = { lte: Number(maxBudget) };
    if (minBudget) where.budgetMax = { gte: Number(minBudget) };
  }

  const hasCriteria = !!(minBudget || maxBudget || bhk || location);

  const preferences = hasCriteria
    ? await prisma.propertyPreference.findMany({
        where,
        include: { contact: { select: { id: true, name: true, phone: true, email: true, status: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      })
    : [];

  return { hasCriteria, leads: preferences };
};

export const overviewStats = async (tenantId: string) => {
  const leadsWithRequirements = await prisma.propertyPreference.count({ where: { tenantId } });
  const totalContacts = await prisma.contact.count({ where: { tenantId } });
  return {
    leadsWithRequirements,
    noRequirementsYet: Math.max(0, totalContacts - leadsWithRequirements),
  };
};
