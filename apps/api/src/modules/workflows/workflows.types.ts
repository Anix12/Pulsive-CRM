import { z } from 'zod';

const WorkflowStepSchema = z.object({
  id: z.string(),
  type: z.enum(['SEND_SMS', 'SEND_WHATSAPP', 'SCHEDULE_CALL', 'CREATE_TASK', 'WEBHOOK', 'WAIT']),
  config: z.record(z.unknown()),
  nextStepId: z.string().nullable(),
});

const WorkflowTriggerSchema = z.object({
  type: z.enum(['INCOMING_CALL', 'MESSAGE_RECEIVED', 'DEAL_STAGE_CHANGED', 'CONTACT_CREATED', 'SCHEDULE']),
  config: z.record(z.unknown()).optional().default({}),
});

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  trigger: WorkflowTriggerSchema,
  steps: z.array(WorkflowStepSchema),
  isActive: z.boolean().optional().default(false),
});

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
