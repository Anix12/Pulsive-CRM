import { z } from 'zod';

export const InitiateCallSchema = z.object({
  // Left out for a dial-pad call to a raw number - the number is matched to (or turned
  // into) a contact server-side, so it's never truly contact-less.
  contactId: z.string().min(1).optional(),
  toNumber: z.string().min(7),
  recordingEnabled: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

export const SessionCallSchema = z.object({
  contactId: z.string().min(1),
  // Saved to the agent's profile the first time; the agent's mobile is rung first.
  agentPhone: z.string().min(7).max(20).optional(),
});

// Only meaningful on a "Yes Connected" outcome: the pipeline stage picked, and the
// answers to that campaign's (or the tenant default's) Engagement Form.
const ConnectedExtras = {
  stage: z.string().max(60).optional(),
  engagementFormId: z.string().optional(),
  answers: z.record(z.union([z.string(), z.null()])).optional(),
};

export const CallOutcomeSchema = z
  .object({
    connected: z.boolean(),
    reason: z.string().max(100).optional(),
    remark: z.string().max(1500).optional(),
    followUpAt: z.string().datetime().optional(),
    ...ConnectedExtras,
  })
  .refine((v) => v.connected || !!v.reason, { message: 'Select a reason for the not-connected call', path: ['reason'] });

// Disposing a lead with no call ever placed for it.
export const DisposeLeadSchema = z
  .object({
    contactId: z.string().min(1),
    connected: z.boolean(),
    reason: z.string().max(100).optional(),
    remark: z.string().max(1500).optional(),
    followUpAt: z.string().datetime().optional(),
    ...ConnectedExtras,
  })
  .refine((v) => v.connected || !!v.reason, { message: 'Select a reason for the not-connected call', path: ['reason'] });

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
