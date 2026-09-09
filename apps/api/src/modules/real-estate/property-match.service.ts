import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { Request } from 'express';
import { ScoredUnitMatch, UpsertPropertyPreferenceInput } from './real-estate.types';

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

// ─── Scoring ──────────────────────────────────────────────────────────────────
// Simple weighted heuristic, not full AI yet. Hard filters (budget/city/type) are
// applied at the DB query level below, so every unit reaching scoreUnit() has
// already passed them — the "Matches budget" style reasons just make that explicit
// to the agent using the match, rather than requiring them to re-derive it.
//
// Soft points (sum to 100 when everything matches):
//   floor match        30  (exact) / 15 (adjacent floor)
//   amenities overlap  40  (proportional to how many of the preferred amenities are present)
//   facing match       20  (exact)
//   commute mention    10  (preference text appears in the project's location/description)

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const scoreUnit = (
  preference: { preferredFloor: number | null; facing: string | null; amenities: unknown; commutePreference: string | null },
  unit: { floor: number | null; facing: string | null },
  project: { amenities: unknown; location: string | null; description: string | null },
): { fitScore: number; fitReasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  if (preference.preferredFloor != null && unit.floor != null) {
    const diff = Math.abs(unit.floor - preference.preferredFloor);
    if (diff === 0) {
      score += 30;
      reasons.push('Preferred floor available');
    } else if (diff === 1) {
      score += 15;
      reasons.push('Close to preferred floor');
    }
  }

  const preferredAmenities = asStringArray(preference.amenities);
  const projectAmenities = asStringArray(project.amenities);
  if (preferredAmenities.length > 0 && projectAmenities.length > 0) {
    const projectSet = new Set(projectAmenities.map((a) => a.toLowerCase()));
    const matched = preferredAmenities.filter((a) => projectSet.has(a.toLowerCase()));
    if (matched.length > 0) {
      score += Math.round((matched.length / preferredAmenities.length) * 40);
      reasons.push(`Has ${matched.join(', ')}`);
    }
  }

  if (preference.facing && unit.facing && preference.facing.toLowerCase() === unit.facing.toLowerCase()) {
    score += 20;
    reasons.push('Matches facing preference');
  }

  if (preference.commutePreference) {
    const haystack = `${project.location ?? ''} ${project.description ?? ''}`.toLowerCase();
    if (haystack.includes(preference.commutePreference.toLowerCase())) {
      score += 10;
      reasons.push(`Near "${preference.commutePreference}"`);
    }
  }

  return { fitScore: Math.min(100, score), fitReasons: reasons };
};

// Matches a contact's stored preferences against available inventory. City + unit
// type + budget are hard filters (applied in the query, a unit outside them is
// excluded outright); floor/amenities/facing/commute are soft-scored on top.
export const matchesForContact = async (tenantId: string, contactId: string, limit = 20) => {
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
    include: { project: { select: { id: true, name: true, city: true, location: true, description: true, amenities: true } } },
    take: 200, // score a generous pool, then trim to `limit` by fitScore
  });

  const hardFilterReasons: string[] = [];
  if (preference.preferredType) hardFilterReasons.push('Matches preferred type');
  if (preference.preferredCity) hardFilterReasons.push('Located in preferred city');
  if (preference.budgetMin || preference.budgetMax) hardFilterReasons.push('Matches budget');

  const scored: ScoredUnitMatch[] = units.map((unit) => {
    const { fitScore, fitReasons } = scoreUnit(preference, unit, unit.project);
    return { ...unit, fitScore, fitReasons: [...hardFilterReasons, ...fitReasons] } as unknown as ScoredUnitMatch;
  });

  scored.sort((a, b) => b.fitScore - a.fitScore);

  return { preference, matches: scored.slice(0, limit) };
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
