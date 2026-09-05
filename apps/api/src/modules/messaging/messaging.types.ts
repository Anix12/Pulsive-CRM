import { z } from 'zod';

export const SendMessageSchema = z.object({
  contactId: z.string().min(1),
  channel: z.enum(['SMS', 'WHATSAPP']),
  body: z.string().min(1).max(4096),
  templateId: z.string().optional(),
  mediaUrl: z.string().url().optional(),
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
  isDlt: z.boolean().optional().default(false),
  dltTemplateId: z.string().optional(),
  dltSenderId: z.string().optional(),
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export const AiDraftEmailSchema = z.object({
  topic: z.string().min(1).max(300),
  tone: z.string().optional(),
});

export const EmailConfigSchema = z.object({
  provider: z.enum(['SES', 'SMTP']).default('SES'),
  sendingDomain: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().positive().optional(),
  smtpUser: z.string().optional(),
  // TODO: encrypt — stored as-is for now, matching the twilioAuthToken field's
  // current level of rigor (schema comment says "AES encrypted" but no encryption is implemented yet)
  smtpPassword: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type AiDraftEmailInput = z.infer<typeof AiDraftEmailSchema>;
export type EmailConfigInput = z.infer<typeof EmailConfigSchema>;
