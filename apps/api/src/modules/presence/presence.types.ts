import { z } from 'zod';

export const StartBreakSchema = z.object({
  label: z.string().min(1).max(100),
  // Omitted = open-ended break, ended only by the agent. Set = auto-resume after this
  // many minutes (still endable early at any time).
  durationMinutes: z.number().int().min(1).max(480).optional(),
});

export type StartBreakInput = z.infer<typeof StartBreakSchema>;
