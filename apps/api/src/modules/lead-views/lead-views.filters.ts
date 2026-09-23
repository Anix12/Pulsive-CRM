import type { Prisma } from '@/db/generated';
import type { LeadViewFilters } from './lead-views.types';

// Lead "status" is not a column on Contact. It is derived from calls and tasks, so the
// same rule powers both the system views and the Lead status filter of custom views.
const NOT_CONNECTED_CALL: Prisma.CallWhereInput = {
  OR: [{ status: { in: ['BUSY', 'NO_ANSWER', 'FAILED', 'CANCELLED'] } }, { outcome: { is: { connected: false } } }],
};

export const statusWhere = (key: string): Prisma.ContactWhereInput => {
  switch (key) {
    case 'uncontacted':
      return { calls: { none: {} } };
    case 'in_progress':
      return { calls: { some: {} }, status: { in: ['LEAD', 'PROSPECT'] } };
    case 'follow_up':
      return { tasks: { some: { status: 'PENDING' } } };
    case 'not_connected':
      return { calls: { some: NOT_CONNECTED_CALL } };
    default:
      return {};
  }
};

export const orderByFor = (sort?: string): Prisma.ContactOrderByWithRelationInput => {
  switch (sort) {
    case 'oldest': return { createdAt: 'asc' };
    case 'name': return { name: 'asc' };
    case 'score': return { score: 'desc' };
    default: return { createdAt: 'desc' };
  }
};

// Hardcoded server-side on purpose: system views are not editable filter sets.
export const SYSTEM_VIEWS = [
  { id: 'system:all', name: 'All Leads', description: 'All leads at one place', status: null },
  { id: 'system:uncontacted', name: 'Uncontacted', description: 'Leads which have not been called so far', status: 'uncontacted' },
  { id: 'system:in-progress', name: 'In-Progress', description: 'Leads that are in progress and not yet closed', status: 'in_progress' },
  { id: 'system:follow-up', name: 'Follow-up', description: 'Leads which are scheduled to be called later', status: 'follow_up' },
  { id: 'system:not-connected', name: 'Not Connected', description: 'Leads which were not connected in previous attempt', status: 'not_connected' },
] as const;

export const buildWhere = (tenantId: string, filters: LeadViewFilters = {}): Prisma.ContactWhereInput => {
  const and: Prisma.ContactWhereInput[] = [];
  if (filters.campaignId) and.push({ campaignId: filters.campaignId });
  if (filters.stagesAndTags?.stages?.length) and.push({ realEstateStage: { in: filters.stagesAndTags.stages as any } });
  if (filters.stagesAndTags?.tags?.length) and.push({ tags: { hasSome: filters.stagesAndTags.tags } });
  if (filters.leadStatus) and.push(statusWhere(filters.leadStatus));
  const range = filters.creationDateRange;
  if (range?.from || range?.to) {
    and.push({
      createdAt: {
        ...(range.from ? { gte: new Date(range.from) } : {}),
        ...(range.to ? { lte: new Date(range.to) } : {}),
      },
    });
  }
  return { tenantId, ...(and.length ? { AND: and } : {}) };
};

// "Campaign, Lead status, Sorting (default)" - always ends with Sorting.
export const describeFilters = (f: LeadViewFilters = {}): string => {
  const parts: string[] = [];
  if (f.campaignId) parts.push('Campaign');
  if (f.stagesAndTags?.stages?.length || f.stagesAndTags?.tags?.length) parts.push('Stages & Tags');
  if (f.leadStatus) parts.push('Lead status');
  if (f.creationDateRange?.from || f.creationDateRange?.to) parts.push('Creation date');
  parts.push(f.sortOrder && f.sortOrder !== 'newest' ? 'Sorting' : 'Sorting (default)');
  return parts.join(', ');
};
