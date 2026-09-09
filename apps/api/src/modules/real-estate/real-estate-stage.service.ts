import prisma from '@/db/client';
import { REAL_ESTATE_LEAD_STAGES, RealEstateLeadStageValue } from './real-estate.types';

const rankOf = (stage: RealEstateLeadStageValue | null) =>
  stage ? REAL_ESTATE_LEAD_STAGES.indexOf(stage) : -1;

/**
 * Reusable helper for other real-estate modules (site-visits, bookings) to advance a
 * contact's real-estate lead funnel stage. Mirrors createNotification's role as a small
 * shared function other services import, rather than duplicating stage logic in each.
 *
 * Never moves the stage backwards — if the contact is already at or past `toStage`,
 * this is a no-op (and nothing is written to the history table).
 */
export const advanceStage = async (
  tenantId: string,
  contactId: string,
  toStage: RealEstateLeadStageValue,
  triggeredBy: string,
) => {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId },
    select: { realEstateStage: true },
  });
  if (!contact) return null;

  const fromStage = contact.realEstateStage as RealEstateLeadStageValue | null;
  if (rankOf(toStage) <= rankOf(fromStage)) return null;

  const [updated] = await prisma.$transaction([
    prisma.contact.update({ where: { id: contactId }, data: { realEstateStage: toStage } }),
    prisma.realEstateStageHistory.create({
      data: { tenantId, contactId, fromStage: fromStage ?? undefined, toStage, triggeredBy },
    }),
  ]);

  return updated;
};

export const getStage = async (tenantId: string, contactId: string) => {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId },
    select: { id: true, name: true, realEstateStage: true },
  });
  if (!contact) return null;

  const history = await prisma.realEstateStageHistory.findMany({
    where: { tenantId, contactId },
    orderBy: { changedAt: 'desc' },
  });

  return { contactId: contact.id, contactName: contact.name, currentStage: contact.realEstateStage, history };
};
