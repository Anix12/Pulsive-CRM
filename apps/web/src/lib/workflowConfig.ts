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

export function triggerLabel(type?: string) {
  return TRIGGER_TYPES.find((t) => t.value === type)?.label || type || 'Unknown trigger';
}

export function stepMeta(type?: string) {
  return STEP_TYPES.find((s) => s.value === type);
}
