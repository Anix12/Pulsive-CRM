import { z } from 'zod';

export const APPLICATION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'OFFERED',
  'ENROLLED',
  'REJECTED',
] as const;

export const CreateApplicationSchema = z.object({
  contactId: z.string().min(1),
  programId: z.string().min(1),
  appNumber: z.string().min(1).max(50).optional(),
  notes: z.string().optional(),
});

export const UpdateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  programId: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;
