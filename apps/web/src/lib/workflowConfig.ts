import {
  UserPlus, RefreshCw, UserCog, Upload, Clock as ClockTrigger,
  Mail, MessageSquare, Clock, GitBranch, ClipboardList, StickyNote,
  Repeat, Copy, Webhook, type LucideIcon,
} from 'lucide-react';

export interface TriggerOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface StepOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const TRIGGER_TYPES: TriggerOption[] = [
  { value: 'CONTACT_CREATED', label: 'Lead Created', description: 'When a new lead is added', icon: UserPlus },
  { value: 'DEAL_STAGE_CHANGED', label: 'Stage Changed', description: 'When lead stage is updated', icon: RefreshCw },
  { value: 'LEAD_ASSIGNED', label: 'Lead Assigned', description: 'When lead is assigned to agent', icon: UserCog },
  { value: 'LEAD_IMPORTED', label: 'Lead Imported', description: 'When leads are imported via CSV', icon: Upload },
  { value: 'FOLLOWUP_DUE', label: 'Follow-up Due', description: 'When follow-up date is reached', icon: ClockTrigger },
];

export const STEP_TYPES: StepOption[] = [
  { value: 'SEND_EMAIL', label: 'Send Email', icon: Mail },
  { value: 'SEND_SMS', label: 'Send SMS', icon: MessageSquare },
  { value: 'WAIT', label: 'Wait / Delay', icon: Clock },
  { value: 'CONDITION', label: 'Condition (IF/ELSE)', icon: GitBranch },
  { value: 'ASSIGN_AGENT', label: 'Assign Agent', icon: UserCog },
  { value: 'CHANGE_STAGE', label: 'Change Stage', icon: RefreshCw },
  { value: 'CREATE_TASK', label: 'Create Task', icon: ClipboardList },
  { value: 'ADD_NOTE', label: 'Add Note', icon: StickyNote },
  { value: 'CHANGE_CAMPAIGN', label: 'Change Campaign', icon: Repeat },
  { value: 'DUPLICATE_LEAD', label: 'Duplicate Lead', icon: Copy },
  { value: 'WEBHOOK', label: 'Webhook', icon: Webhook },
];

export interface WorkflowExample {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  steps: { type: string; config: Record<string, string> }[];
}

export const WORKFLOW_EXAMPLES: WorkflowExample[] = [
  {
    id: 'new-lead-welcome',
    name: 'Welcome a new lead',
    description: 'Send a welcome email, then create a personal follow-up task.',
    triggerType: 'CONTACT_CREATED',
    steps: [
      { type: 'SEND_EMAIL', config: { subject: 'Thanks for reaching out, {{name}}', body: 'Hi {{name}}, thanks for your interest. Our team will be in touch shortly.' } },
      { type: 'CREATE_TASK', config: { subject: 'Follow up with new lead' } },
    ],
  },
  {
    id: 'follow-up-reminder',
    name: 'Follow-up reminder',
    description: 'Send a short SMS when a lead follow-up becomes due and add a call task.',
    triggerType: 'FOLLOWUP_DUE',
    steps: [
      { type: 'SEND_SMS', config: { message: 'Hi {{name}}, just checking in. Is now a good time to talk?' } },
      { type: 'CREATE_TASK', config: { subject: 'Call lead after follow-up message' } },
    ],
  },
  {
    id: 'stage-handoff',
    name: 'Stage handoff',
    description: 'Add context and prepare an agent assignment when a deal changes stage.',
    triggerType: 'DEAL_STAGE_CHANGED',
    steps: [
      { type: 'ADD_NOTE', config: { note: 'Deal stage changed. Review recent activity before reaching out.' } },
      { type: 'ASSIGN_AGENT', config: {} },
      { type: 'CREATE_TASK', config: { subject: 'Contact lead after stage change' } },
    ],
  },
];

export function triggerLabel(type?: string) {
  return TRIGGER_TYPES.find((t) => t.value === type)?.label || type || 'Unknown trigger';
}

export function stepMeta(type?: string) {
  return STEP_TYPES.find((s) => s.value === type);
}
