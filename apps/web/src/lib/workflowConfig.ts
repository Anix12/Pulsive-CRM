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
  trigger: string;
  steps: { type: string; config: Record<string, string> }[];
}

// Static starter workflows shown on the Workflows page. "Use this example"
// opens /dashboard/workflows/new?example=<id> with these values prefilled.
export const WORKFLOW_EXAMPLES: WorkflowExample[] = [
  {
    id: 'welcome-new-leads',
    name: 'Welcome new leads',
    description: 'Greet every new lead right away, then remind your team to call them the next day.',
    trigger: 'CONTACT_CREATED',
    steps: [
      { type: 'SEND_SMS', config: { message: 'Hi {{name}}, thanks for your interest! We will call you shortly.' } },
      { type: 'WAIT', config: { delayMinutes: '1440' } },
      { type: 'CREATE_TASK', config: { subject: 'Call {{name}} - first follow-up' } },
    ],
  },
  {
    id: 'followup-reminder',
    name: 'Follow-up reminder',
    description: 'When a follow-up date arrives, email the lead and create a task so nothing is missed.',
    trigger: 'FOLLOWUP_DUE',
    steps: [
      { type: 'SEND_EMAIL', config: { subject: 'Following up, {{name}}', body: 'Hi {{name}}, just checking in on our last conversation. Is now a good time to talk?' } },
      { type: 'CREATE_TASK', config: { subject: 'Follow up with {{name}}' } },
    ],
  },
  {
    id: 'auto-assign-leads',
    name: 'Auto-assign new leads',
    description: 'Give every new lead an owner immediately and leave a note. Pick the agent after loading the example.',
    trigger: 'CONTACT_CREATED',
    steps: [
      { type: 'ASSIGN_AGENT', config: {} },
      { type: 'ADD_NOTE', config: { note: 'Lead auto-assigned by workflow.' } },
    ],
  },
  {
    id: 're-engage-leads',
    name: 'Re-engage quiet leads',
    description: 'After a lead changes stage, wait a few days and nudge them, then ask an agent to follow up.',
    trigger: 'DEAL_STAGE_CHANGED',
    steps: [
      { type: 'WAIT', config: { delayMinutes: '4320' } },
      { type: 'SEND_SMS', config: { message: 'Hi {{name}}, any questions we can help with? Happy to chat.' } },
      { type: 'CREATE_TASK', config: { subject: 'Re-engage {{name}}' } },
    ],
  },
];

export function triggerLabel(type?: string) {
  return TRIGGER_TYPES.find((t) => t.value === type)?.label || type || 'Unknown trigger';
}

export function stepMeta(type?: string) {
  return STEP_TYPES.find((s) => s.value === type);
}
