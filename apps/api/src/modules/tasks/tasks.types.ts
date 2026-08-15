import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  assignedToId: z.string().min(1),
  dueDate: z.string().min(1),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
