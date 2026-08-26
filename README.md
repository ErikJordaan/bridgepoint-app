# BridgePoint — Standalone App (Foundation)

This is the new, standalone BridgePoint — a fresh build replacing the
SharePoint-based version entirely. Its own database, its own login, its own
domain (`bridgepointapp.co.za`), hosted on Vercel.

**This is the foundation only**: authentication, the role/permission system,
and the database schema (including configurable fields). The actual Deals
board, Companies/Contacts screens, Reports, and Admin UI come next, once this
base is confirmed working.

---

## Stack

- **Next.js** (App Router) — UI + backend in one app
- **PostgreSQL** via **Drizzle ORM** — the database
- **Better Auth** — email/password authentication, sessions
- **Resend** — password reset emails
- Deployed to **Vercel** (Hobby during development, switch to Pro before real users go live — see note at the bottom)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up a Postgres database

Easiest path: create a Vercel account (if you haven't), create a new project,
then in the project's **Storage** tab → **Create Database** → **Postgres**.
Copy the connection string it gives you.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — from step 2
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`
- `RESEND_API_KEY` — sign up at resend.com (free tier is fine to start), create an API key
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — your own first login

### 4. Generate Better Auth's own database tables

Better Auth manages its own schema (user, session, account, verification
tables) — don't hand-write these, let it generate them based on the config in
`src/lib/auth.ts`:

```bash
npx @better-auth/cli generate
```

This creates a schema file for Better Auth's own tables.

### 5. Create all the database tables

```bash
npm run db:generate
npm run db:migrate
```

### 6. Seed default roles, deal stages, and your first login

```bash
npm run db:seed
```

This creates four starting roles (Admin, Back Office, Operations, Sales) with
sensible default permissions — all fully editable afterward through the Admin
screens, nothing here is locked in. It also creates your first Admin login
using the email/password from `.env.local`.

### 7. Run it locally

```bash
npm run dev
```

Open **http://localhost:3000**, sign in with the admin account you just
seeded.

---

## How the permission system works

- **Roles** are just names — fully admin-manageable, not hardcoded (create,
  rename, delete freely once the Admin UI exists)
- **Permissions** are a fixed list of capabilities defined in
  `src/lib/permissions.ts` (e.g. "Create opportunities", "Manage users") —
  this list is code, not database rows, since it needs to match what the app
  actually checks
- What's configurable is **which permissions each role has** — that's the
  `role_permissions` table, and it's exactly the "click what each role can and
  cannot do" screen you asked for

## How configurable fields work

Each of Opportunities, Companies, and Contacts has a `customFields` column
that stores whatever extra fields an admin has defined, keyed by a stable
field key. The `field_definitions` table describes what fields currently
exist, their type (text/number/date/currency/boolean/select), and whether
they're required. The Admin UI for managing these comes in a later build step.

---

## What's next

Once you've confirmed sign-in works and you can see the placeholder
Dashboard, the next build phase is:
1. The Admin screens (manage users, roles/permissions, deal stages, custom fields)
2. Companies & Contacts
3. The Deals Kanban board
4. Reports

## Before going live

Remember: **switch from Vercel Hobby to Pro before real BTSA staff start
using this for real work** — Hobby is for development/non-commercial use
only. I'll remind you again when we're closer to that point, but it's worth
having in mind now.
