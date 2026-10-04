# Your CRM prototype, now with real login

This is your existing `crm.html` — every screen (Home, My Campaigns, My
Leads, Neo WhatsApp, Walk-in Leads, Call Logs, Reports, Voice & Devices,
Web Dialer, My Tasks) is unchanged. What's new: it's now wrapped behind a
real, working login/signup screen, and "PT pvt ltd" is gone — the sidebar
shows whatever company name *you* enter when you sign up.

## What actually changed inside `crm.html`

- `REP_ME` and `TENANT` went from hardcoded constants to variables set from
  the logged-in user's real account after authentication
- The app's main `render()` function now shows a login/signup screen
  whenever there's no valid session, and only renders the dashboard once
  one exists
- A Logout button was added to the sidebar
- Nothing else changed — same mock data, same features, same look

## Stack (free)

Node.js + Express + SQLite + bcrypt + JWT — same lightweight, no-cloud-bill
approach as everything else so far. Only the `users` table is real/persisted
here; the CRM's leads/campaigns/logs/tasks stay as the client-side mock data
your prototype already had (see the note at the bottom on wiring those up
for real per-user persistence later).

## Run it

```bash
cd backend
npm install
cp .env.example .env
# open .env and set JWT_SECRET to any random string
npm start
```

Open **http://localhost:4000** — you'll land on the Pulsive login/signup
screen. Sign up with your name, a company/workspace name, an email and a
password, and you're straight into the full dashboard you already had,
now labeled with your own identity instead of a fixed example tenant.

Try it with two different accounts (e.g. a second signup in an incognito
window) — each one gets its own login, but note the CRM's demo leads,
campaigns, etc. are still the *same* shared mock data for every account in
this version, since only login itself was made real. See below for the
next step if you want each user's leads/calls/tasks to be genuinely
separate and persisted too.

## Next step: making the CRM's data real per-user too

Right now, logging in as two different people shows the same demo leads,
campaigns and call logs to both — only the *identity* (your name/company)
is real and separated; the data underneath is still shared mock data.

To make leads/tasks/call logs genuinely private and persisted per user
(like the fuller `pulsive-crm-dashboard` project from earlier in this
conversation), the pattern is the same three steps every time:

1. Add a table to `database/schema.sql`, with a `user_id` column
2. Add a route file in `backend/src/routes/` that starts with
   `router.use(requireAuth)` and filters every query by `WHERE user_id = ?`
3. In `crm.html`, replace the relevant hardcoded array (e.g. `let leads = [...]`)
   with a `fetch()` call to that new route, wired the same way `authApi()`
   already works for login

Happy to build that out fully the same way if/when you want it — this pass
specifically covers the login/credentials piece you asked for.
