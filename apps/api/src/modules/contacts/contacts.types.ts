import { z } from 'zod';

export const CreateContactSchema = z.object({
  name: z.string().min(1).max(200),
  // Frontend sends '' (not undefined) for an untouched/cleared text input — accept
  // that as "no email" instead of failing .email() format validation on it.
  email: z.string().email('Invalid email').optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  phone: z.string().min(7).max(20),
  alternatePhone: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  status: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'BLOCKED']).optional(),
  temperature: z.enum(['HOT', 'WARM', 'COLD']).nullable().optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  // nullable: the "Unassigned" option in the UI submits null, not undefined.
  assignedToId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
});

export const UpdateContactSchema = CreateContactSchema.partial();

export const ContactQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'BLOCKED']).optional(),
  temperature: z.enum(['HOT', 'WARM', 'COLD']).optional(),
  assignedToId: z.string().optional(),
  tag: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
