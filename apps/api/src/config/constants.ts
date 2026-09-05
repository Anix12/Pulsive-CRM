export const RATE_LIMIT = {
  GLOBAL: { windowMs: 15 * 60 * 1000, max: 500 },
  AUTH: { windowMs: 15 * 60 * 1000, max: 20 },
  API_KEY: { windowMs: 60 * 1000, max: 100 },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  IMPERSONATE: 'IMPERSONATE',
  API_KEY_CREATE: 'API_KEY_CREATE',
  API_KEY_REVOKE: 'API_KEY_REVOKE',
} as const;

export const QUEUE_NAMES = {
  CALLS: 'calls',
  MESSAGES: 'messages',
  WORKFLOWS: 'workflows',
  EMAIL: 'email',
  GOOGLE_SHEETS_SYNC: 'google-sheets-sync',
} as const;

export const SOCKET_EVENTS = {
  CALL_STATUS_UPDATE: 'call:status_update',
  MESSAGE_STATUS_UPDATE: 'message:status_update',
  WORKFLOW_EXECUTION: 'workflow:execution',
  NOTIFICATION: 'notification',
} as const;
