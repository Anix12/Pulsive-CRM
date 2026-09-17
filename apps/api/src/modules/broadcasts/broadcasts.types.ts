import { z } from 'zod';

const AUDIENCE_SOURCES = ['CAMPAIGN', 'STATUS', 'ALL'] as const;
const CONTACT_STATUSES = ['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'BLOCKED'] as const;

export const AudienceFilterSchema = z.object({
  audienceSource: z.enum(AUDIENCE_SOURCES),
  campaignId: z.string().optional(),
  statusFilter: z.enum(CONTACT_STATUSES).optional(),
});

export const CreateBroadcastSchema = AudienceFilterSchema.extend({
  name: z.string().min(1).max(200),
  templateId: z.string().min(1),
});

export type AudienceFilterInput = z.infer<typeof AudienceFilterSchema>;
export type CreateBroadcastInput = z.infer<typeof CreateBroadcastSchema>;
