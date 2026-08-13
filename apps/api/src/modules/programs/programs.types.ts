import { z } from 'zod';

export const CreateProgramSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, 'Code may only contain letters, numbers, and hyphens'),
  name: z.string().min(1).max(200),
  degreeLevel: z.enum(['UG', 'PG']),
  department: z.string().max(200).optional(),
  durationMonths: z.number().int().positive().optional(),
  intakeCapacity: z.number().int().positive().optional(),
  tuitionFeePerYear: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export const UpdateProgramSchema = CreateProgramSchema.partial();

export type CreateProgramInput = z.infer<typeof CreateProgramSchema>;
export type UpdateProgramInput = z.infer<typeof UpdateProgramSchema>;
