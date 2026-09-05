import { z } from 'zod';

// ── Custom Fields ────────────────────────────────────────────────────────────

export const CreateCustomFieldSchema = z.object({
  entity: z.enum(['CONTACT', 'DEAL']).default('CONTACT'),
  name: z.string().min(1).max(100),
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, 'Key must be lowercase snake_case'),
  type: z.enum(['TEXT', 'NUMBER', 'DROPDOWN', 'DATE', 'BOOLEAN']).default('TEXT'),
  options: z.array(z.string()).optional().default([]),
  order: z.number().int().optional(),
});
export const UpdateCustomFieldSchema = CreateCustomFieldSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Scoring Rules ────────────────────────────────────────────────────────────

export const CreateScoringRuleSchema = z.object({
  field: z.string().min(1).max(100),
  operator: z.enum(['equals', 'contains', 'gt', 'lt']),
  value: z.string().min(1).max(200),
  points: z.number().int(),
});
export const UpdateScoringRuleSchema = CreateScoringRuleSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Pipelines ────────────────────────────────────────────────────────────────

export const CreatePipelineSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
});
export const UpdatePipelineSchema = CreatePipelineSchema.partial();

// ── Call Dispositions ────────────────────────────────────────────────────────

export const CreateCallDispositionSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  movesToStageId: z.string().optional(),
  order: z.number().int().optional(),
});
export const UpdateCallDispositionSchema = CreateCallDispositionSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export const CopyDispositionsSchema = z.object({
  fromPipelineId: z.string().optional(), // reserved for future pipeline-scoped dispositions
  toStageId: z.string().min(1),
});

// ── Report Schedules ─────────────────────────────────────────────────────────

export const CreateReportScheduleSchema = z.object({
  name: z.string().min(1).max(150),
  reportKeys: z.array(z.string()).min(1),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
  timeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .default('19:00'),
  recipientEmail: z.string().email(),
});
export const UpdateReportScheduleSchema = CreateReportScheduleSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Break Windows ────────────────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const CreateBreakWindowSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
});
export const UpdateBreakWindowSchema = CreateBreakWindowSchema.partial();

// ── Roles & Permissions ──────────────────────────────────────────────────────

export const UpdateRolePermissionSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT']),
  permissions: z.record(z.record(z.boolean())),
  managerScopedAccess: z.boolean().optional(),
});

export type CreateCustomFieldInput = z.infer<typeof CreateCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof UpdateCustomFieldSchema>;
export type CreateScoringRuleInput = z.infer<typeof CreateScoringRuleSchema>;
export type UpdateScoringRuleInput = z.infer<typeof UpdateScoringRuleSchema>;
export type CreatePipelineInput = z.infer<typeof CreatePipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineSchema>;
export type CreateCallDispositionInput = z.infer<typeof CreateCallDispositionSchema>;
export type UpdateCallDispositionInput = z.infer<typeof UpdateCallDispositionSchema>;
export type CreateReportScheduleInput = z.infer<typeof CreateReportScheduleSchema>;
export type UpdateReportScheduleInput = z.infer<typeof UpdateReportScheduleSchema>;
export type CreateBreakWindowInput = z.infer<typeof CreateBreakWindowSchema>;
export type UpdateBreakWindowInput = z.infer<typeof UpdateBreakWindowSchema>;
export type UpdateRolePermissionInput = z.infer<typeof UpdateRolePermissionSchema>;
