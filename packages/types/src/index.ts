// ─── Common ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT';

// ─── Contacts ─────────────────────────────────────────────────────────────────

export type ContactStatus = 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'CHURNED' | 'BLOCKED';

export interface Contact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  status: ContactStatus;
  source?: string;
  tags: string[];
  customFields?: Record<string, unknown>;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export interface DealStage {
  id: string;
  tenantId: string;
  name: string;
  order: number;
  probability: number;
  color?: string;
  isWon: boolean;
  isLost: boolean;
}

export interface Deal {
  id: string;
  tenantId: string;
  contactId: string;
  stageId: string;
  title: string;
  value?: number;
  currency: string;
  expectedCloseDate?: string;
  assignedToId?: string;
  closedAt?: string;
  isWon?: boolean;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
  stage?: DealStage;
  contact?: Pick<Contact, 'id' | 'firstName' | 'lastName' | 'phone'>;
}

// ─── Calls ────────────────────────────────────────────────────────────────────

export type CallDirection = 'INBOUND' | 'OUTBOUND';
export type CallStatus = 'INITIATED' | 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BUSY' | 'NO_ANSWER' | 'CANCELLED';

export interface Call {
  id: string;
  tenantId: string;
  contactId?: string;
  agentId?: string;
  direction: CallDirection;
  status: CallStatus;
  fromNumber: string;
  toNumber: string;
  duration?: number;
  recordingUrl?: string;
  transcription?: string;
  isAiInitiated: boolean;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export type MessageChannel = 'SMS' | 'WHATSAPP';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface Message {
  id: string;
  tenantId: string;
  contactId?: string;
  channel: MessageChannel;
  direction: 'INBOUND' | 'OUTBOUND';
  status: MessageStatus;
  fromNumber: string;
  toNumber: string;
  body: string;
  mediaUrl?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

// ─── Workflows ────────────────────────────────────────────────────────────────

export type WorkflowTriggerType = 'INCOMING_CALL' | 'MESSAGE_RECEIVED' | 'DEAL_STAGE_CHANGED' | 'CONTACT_CREATED' | 'SCHEDULE';
export type WorkflowStepType = 'SEND_SMS' | 'SEND_WHATSAPP' | 'SCHEDULE_CALL' | 'CREATE_TASK' | 'WEBHOOK' | 'WAIT';

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  config: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  config: Record<string, unknown>;
  nextStepId: string | null;
}

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
}
