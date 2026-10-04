-- Just what real login needs. Everything else in the CRM (leads,
-- campaigns, call logs, tasks) stays client-side mock data inside
-- crm.html, exactly as it already worked — this only adds real,
-- persisted user accounts and gates access to the dashboard.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  company       TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);
