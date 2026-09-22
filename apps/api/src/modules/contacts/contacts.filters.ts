import type { Prisma } from '@/db/generated';
import { statusWhere } from '@/modules/lead-views/lead-views.filters';

// Filters of the "View leads" screen (Campaigns, Stages & Tags, Lead Status, Creation Date
// and the All Filters search). They arrive as query strings and are ANDed with the Lead
// View's own filter, so they narrow a view instead of replacing it.

const STAGES = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPERTY_SHARED', 'VISIT_SCHEDULED',
  'VISIT_DONE', 'NEGOTIATION', 'BOOKING', 'CLOSED_WON', 'CLOSED_LOST',
];

const csv = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const dateRange = (preset?: string, from?: string, to?: string): { gte?: Date; lt?: Date } | null => {
  const today = startOfDay(new Date());
  switch (preset) {
    case 'today': return { gte: today, lt: addDays(today, 1) };
    case 'yesterday': return { gte: addDays(today, -1), lt: today };
    case 'last7': return { gte: addDays(today, -6), lt: addDays(today, 1) };
    case 'last30': return { gte: addDays(today, -29), lt: addDays(today, 1) };
    case 'custom': {
      if (!from && !to) return null;
      return {
        ...(from ? { gte: startOfDay(new Date(from)) } : {}),
        ...(to ? { lt: addDays(startOfDay(new Date(to)), 1) } : {}),
      };
    }
    default: return null;
  }
};

export const buildLeadFilters = (q: Record<string, string>): Prisma.ContactWhereInput[] => {
  const and: Prisma.ContactWhereInput[] = [];

  const campaignIds = csv(q.campaignIds);
  if (campaignIds.length) and.push({ campaignId: { in: campaignIds } });

  // "Stages & Tags" is one list in the UI: known funnel stages match the stage column,
  // everything else is treated as a tag.
  const stagesTags = csv(q.stagesTags);
  if (stagesTags.length) {
    const stages = stagesTags.filter((s) => STAGES.includes(s));
    const tags = stagesTags.filter((s) => !STAGES.includes(s));
    and.push({
      OR: [
        ...(stages.length ? [{ realEstateStage: { in: stages as any } }] : []),
        ...(tags.length ? [{ tags: { hasSome: tags } }] : []),
      ],
    });
  }

  const statuses = csv(q.leadStatuses);
  if (statuses.length) and.push({ OR: statuses.map((s) => statusWhere(s)) });

  const created = dateRange(q.datePreset, q.dateFrom, q.dateTo);
  if (created) and.push({ createdAt: created });

  if (q.name) and.push({ name: { contains: q.name, mode: 'insensitive' } });
  if (q.phone) and.push({ phone: { contains: q.phone } });
  if (q.email) and.push({ email: { contains: q.email, mode: 'insensitive' } });

  const assigned = csv(q.assignedToIds);
  if (assigned.length) {
    and.push({
      OR: [
        ...(assigned.includes('unassigned') ? [{ assignedToId: null }] : []),
        ...(assigned.filter((a) => a !== 'unassigned').length
          ? [{ assignedToId: { in: assigned.filter((a) => a !== 'unassigned') } }]
          : []),
      ],
    });
  }

  if (q.followUp) {
    const today = startOfDay(new Date());
    const pending = { status: 'PENDING' as const };
    const map: Record<string, Prisma.ContactWhereInput> = {
      today: { tasks: { some: { ...pending, dueDate: { gte: today, lt: addDays(today, 1) } } } },
      overdue: { tasks: { some: { ...pending, dueDate: { lt: new Date() } } } },
      upcoming: { tasks: { some: { ...pending, dueDate: { gte: new Date() } } } },
      none: { tasks: { none: pending } },
    };
    if (map[q.followUp]) and.push(map[q.followUp]);
  }

  // Custom contact properties live in the customFields JSON: {"CITY":"Delhi"}
  if (q.custom) {
    try {
      const props = JSON.parse(q.custom) as Record<string, string>;
      for (const [key, value] of Object.entries(props)) {
        if (value) and.push({ customFields: { path: [key], string_contains: value } });
      }
    } catch { /* ignore a malformed custom filter */ }
  }

  // Converted (customer) and lost (churned) leads stay out of a search unless asked for.
  if (q.includeClosed === 'false') {
    and.push({ status: { notIn: ['CUSTOMER', 'CHURNED'] } });
    and.push({ OR: [{ realEstateStage: null }, { realEstateStage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] as any } }] });
  }

  return and;
};

// Options for the filter dropdowns that are not their own resource (campaigns, users are).
export const stageOptions = STAGES;
