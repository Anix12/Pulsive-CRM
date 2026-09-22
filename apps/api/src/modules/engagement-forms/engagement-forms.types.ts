import { z } from 'zod';

export const FIELD_TYPES = ['text', 'radio', 'date'] as const;

export const FieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(FIELD_TYPES),
  label: z.string().trim().min(1).max(200),
  options: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  required: z.boolean().optional().default(false),
});

export const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(120).optional().default(''),
  description: z.string().trim().max(1000).optional(),
  fields: z.array(FieldSchema).max(30).default([]),
  sendMessage: z.object({ enabled: z.boolean(), body: z.string().trim().max(1000).optional() }).optional(),
});

export const EngagementFormSchemaSchema = z.object({
  sections: z.array(SectionSchema).max(10).default([]),
});

export const SaveEngagementFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  campaignId: z.string().nullable().optional(),
  schema: EngagementFormSchemaSchema,
});

export type FieldType = (typeof FIELD_TYPES)[number];
export type EngagementFormSchema = z.infer<typeof EngagementFormSchemaSchema>;
export type SaveEngagementFormInput = z.infer<typeof SaveEngagementFormSchema>;
