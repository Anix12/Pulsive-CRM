import { z } from 'zod';

export const InitiateCallSchema = z.object({
  contactId: z.string().min(1),
  toNumber: z.string().min(7),
  recordingEnabled: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

export const UpdateCallSchema = z.object({
  notes: z.string().optional(),
  contactId: z.string().optional(),
});

export const TwilioStatusCallbackSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.string(),
  CallDuration: z.string().optional(),
  RecordingSid: z.string().optional(),
  RecordingUrl: z.string().optional(),
});

export type InitiateCallInput = z.infer<typeof InitiateCallSchema>;
