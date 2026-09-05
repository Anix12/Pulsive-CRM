import { z } from 'zod';

export const CreateStageSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const UpdateStageSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const ReorderStagesSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export type CreateStageInput = z.infer<typeof CreateStageSchema>;
export type UpdateStageInput = z.infer<typeof UpdateStageSchema>;
export type ReorderStagesInput = z.infer<typeof ReorderStagesSchema>;

export const CreateDealSchema = z.object({
  contactId: z.string().min(1),
  stageId: z.string().min(1),
  title: z.string().min(1).max(200),
  value: z.number().positive().optional(),
  currency: z.string().default('INR'),
  expectedCloseDate: z.string().datetime().optional(),
  assignedToId: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const UpdateDealSchema = z.object({
  stageId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  value: z.number().positive().optional(),
  currency: z.string().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  assignedToId: z.string().optional(),
  isWon: z.boolean().optional(),
  lostReason: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export type CreateDealInput = z.infer<typeof CreateDealSchema>;
export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;
