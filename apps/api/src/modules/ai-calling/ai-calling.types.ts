import { z } from 'zod';

const KnowledgeTopicSchema = z.object({
  topic: z.string(),
  content: z.string(),
});

const FaqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.string().min(1).max(50).optional().default('English'),
  category: z.string().min(1).max(50).optional().default('General'),
  description: z.string().max(2000).optional(),
  callDirection: z.enum(['INBOUND', 'OUTBOUND']).optional().default('OUTBOUND'),
  greeting: z.string().min(1).max(500),
  systemPrompt: z.string().min(1).max(6000),
  voiceId: z.string().optional(),

  // System Prompt & Rules
  scriptSteps: z.array(z.string()).optional(),
  knowledgeBase: z.array(KnowledgeTopicSchema).optional(),
  pricingResponse: z.string().max(2000).optional(),
  notInterestedResponse: z.string().max(2000).optional(),
  escalationRules: z.string().max(2000).optional(),
  forbiddenTopics: z.string().max(2000).optional(),
  behavioralRules: z.string().max(2000).optional(),
  faqs: z.array(FaqSchema).optional(),

  // Closing & Hangup
  closingMessage: z.string().max(1000).optional(),
  maxCallDurationSec: z.number().int().min(30).max(3600).optional(),
  dailyCallLimit: z.number().int().min(1).max(10000).optional(),
  customHangupLogic: z.string().max(2000).optional(),
});

export const UpdateAgentSchema = CreateAgentSchema.partial().extend({
  status: z.enum(['ACTIVE', 'PAUSED']).optional(),
});

export const InitiateAiCallSchema = z.object({
  toNumber: z.string().min(7),
  contactId: z.string().optional(),
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type InitiateAiCallInput = z.infer<typeof InitiateAiCallSchema>;
