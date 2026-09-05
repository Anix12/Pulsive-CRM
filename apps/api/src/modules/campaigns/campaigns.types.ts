import { z } from 'zod';

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  duplicateCheck: z.enum(['NONE', 'MOBILE_ONLY', 'EMAIL_ONLY', 'BOTH']).optional(),
  assignmentRule: z.enum(['MANUAL', 'ROUND_ROBIN']).optional(),
  pipelineId: z.string().optional().nullable(),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial().extend({
  isPinned: z.boolean().optional(),
});

export const CampaignQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  category: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
