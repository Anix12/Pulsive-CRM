import { z } from 'zod';

export const LEAD_STATUS_KEYS = ['uncontacted', 'in_progress', 'follow_up', 'not_connected'] as const;
export const SORT_ORDERS = ['newest', 'oldest', 'name', 'score'] as const;

export const LeadViewFiltersSchema = z.object({
  campaignId: z.string().nullable().optional(),
  stagesAndTags: z
    .object({
      stages: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
    })
    .optional(),
  leadStatus: z.enum(LEAD_STATUS_KEYS).nullable().optional(),
  creationDateRange: z
    .object({ from: z.string().nullable().optional(), to: z.string().nullable().optional() })
    .optional(),
  sortOrder: z.enum(SORT_ORDERS).optional(),
});

export const CreateLeadViewSchema = z.object({
  name: z.string().trim().min(1).max(60),
  filters: LeadViewFiltersSchema.default({}),
});

export const UpdateLeadViewSchema = CreateLeadViewSchema.partial();

export type LeadViewFilters = z.infer<typeof LeadViewFiltersSchema>;
export type CreateLeadViewInput = z.infer<typeof CreateLeadViewSchema>;
export type UpdateLeadViewInput = z.infer<typeof UpdateLeadViewSchema>;
