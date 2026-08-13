import { z } from 'zod';

export const StartBreakSchema = z.object({
  label: z.string().min(1).max(100),
});

export type StartBreakInput = z.infer<typeof StartBreakSchema>;
