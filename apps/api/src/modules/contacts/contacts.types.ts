import { z } from 'zod';

export const CreateContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20),
  whatsapp: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  status: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'BLOCKED']).optional(),
  temperature: z.enum(['HOT', 'WARM', 'COLD']).nullable().optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  assignedToId: z.string().optional(),
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
