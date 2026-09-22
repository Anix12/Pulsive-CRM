# Demo login credentials

This is the single source of truth for demo accounts in this project. Every row below was
verified by an actual login call against the running API (`POST /api/v1/auth/login` or
`/api/v1/admin/login`) on 2026-09-22, not just copied from the seed script — so if you're
reading this, these are confirmed to work as of that date.

If any of these stop working later, it means the database was reseeded or a password was
changed by hand. Re-run `pnpm db:seed` from `apps/api` to restore the values below (except
`user@gmail.com`, whose password was changed after seeding — see the note under that row).

## Where to log in

| Account type | URL |
|---|---|
| Owner / Admin / Manager / Agent (tenant users) | `/login` |
| Super admin (platform-wide) | `/admin/login` |

Logging in as an AGENT-role user on `/login` redirects automatically to `/user-dashboard.html`
(the agent dashboard) — that is expected, not an error.

## Tenant accounts (log in at `/login`)

All of these belong to the same demo tenant/workspace.

| Role | Email | Password | Notes |
|---|---|---|---|
| Owner | `owner@demo.com` | `Demo@123` | Full workspace access |
| Admin | `admin@demo.com` | `Demo@123` | |
| Manager | `manager@demo.com` | `Demo@123` | |
| Agent | `agent1@demo.com` | `Demo@123` | |
| Agent | `agent2@demo.com` | `Demo@123` | |
| Agent | `user@gmail.com` | `12345678` | Seeded with `user123`, changed to `12345678` on request. If you reseed the database, this account reverts to `user123` unless `apps/api/prisma/seed.ts` is edited first (it already has `12345678` baked in as of this file's date). |

## Super admin (log in at `/admin/login`)

Platform-level account — manages tenants, not a member of any one workspace.

| Email | Password |
|---|---|
| `admin@crm-saas.com` | `SuperAdmin@123` |

## Regenerating these accounts

```bash
cd apps/api
pnpm db:seed
```

This is safe to re-run — it upserts by email and won't duplicate accounts.
