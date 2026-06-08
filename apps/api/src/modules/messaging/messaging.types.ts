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
  channel: z.enum(['SMS', 'WHATSAPP']),
  body: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
