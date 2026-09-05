import { z } from 'zod';

// ── Marketing Lists ─────────────────────────────────────────────────────────
export const CreateMarketingListSchema = z.object({
  name: z.string().min(1).max(200),
  tags: z.array(z.string()).optional(),
});

export const UpdateMarketingListSchema = CreateMarketingListSchema.partial();

// ── Marketing Campaigns (bulk sends) ────────────────────────────────────────
export const CreateMarketingCampaignSchema = z.object({
  listId: z.string().min(1),
  name: z.string().min(1).max(200),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
  templateId: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT']).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const UpdateMarketingCampaignSchema = CreateMarketingCampaignSchema.partial();

export type CreateMarketingListInput = z.infer<typeof CreateMarketingListSchema>;
export type UpdateMarketingListInput = z.infer<typeof UpdateMarketingListSchema>;
export type CreateMarketingCampaignInput = z.infer<typeof CreateMarketingCampaignSchema>;
export type UpdateMarketingCampaignInput = z.infer<typeof UpdateMarketingCampaignSchema>;
