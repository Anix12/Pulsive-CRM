import { z } from 'zod';

const WorkflowStepSchema = z.object({
  id: z.string(),
  type: z.enum([
    'SEND_EMAIL', 'SEND_SMS', 'SEND_WHATSAPP', 'WAIT', 'CONDITION', 'ASSIGN_AGENT',
    'CHANGE_STAGE', 'CREATE_TASK', 'ADD_NOTE', 'CHANGE_CAMPAIGN', 'DUPLICATE_LEAD',
    'WEBHOOK', 'SCHEDULE_CALL',
  ]),
  config: z.record(z.unknown()),
  nextStepId: z.string().nullable(),
});

const WorkflowTriggerSchema = z.object({
  type: z.enum([
    'CONTACT_CREATED', 'DEAL_STAGE_CHANGED', 'LEAD_ASSIGNED', 'LEAD_IMPORTED', 'FOLLOWUP_DUE',
    'INCOMING_CALL', 'MESSAGE_RECEIVED', 'SCHEDULE',
  ]),
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
