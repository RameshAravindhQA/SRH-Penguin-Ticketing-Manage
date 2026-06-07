# Mission Control — Enterprise Ticketing & Project Management

A full-featured enterprise IT management platform: tickets, projects, todos, timesheets, calendar, audit logs, and team management — all in one mission control dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample data
- `pnpm run typecheck:libs` — rebuild lib declarations (run after changing lib/db schemas)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Socket.io (real-time notifications)
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (HS256, 24h expiry), stored in localStorage as `auth_token`
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter router
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/routes/` — all API route handlers (auth, dashboard, tickets, projects, todos, notifications, calendar, timesheets, audit, users)
- `artifacts/api-server/src/lib/` — auth middleware (auth.ts), audit helper (audit.ts), notification helper (notifications.ts)
- `artifacts/enterprise-app/src/pages/` — one file per page
- `artifacts/enterprise-app/src/components/` — layout, tickets, projects, dashboard components
- `artifacts/enterprise-app/src/context/AuthContext.tsx` — JWT token + user session
- `lib/db/src/schema/` — all Drizzle ORM table definitions
- `lib/api-spec/` — OpenAPI 3 spec (source of truth for API contracts)
- `scripts/src/seed.ts` — seed script for sample data

## Architecture decisions

- JWT stored in localStorage (not httpOnly cookie) for simplicity; Bearer token sent on all API requests via custom-fetch.ts
- Socket.io wraps the Express http server for real-time notifications
- All protected routes use `authMiddleware` from `lib/auth.ts` — returns 401 if token missing/expired
- Ticket numbering: TKT-XXXX (sequential from TKT-1001), Project numbering: PRJ-XXXX
- Express 5 async handlers annotated as `: Promise<void>`, wildcard routes use `/{*splat}` syntax
- After any DB schema change, run `pnpm run typecheck:libs` to rebuild lib declarations before typechecking API server

## Seed credentials

| Role           | Email                  | Password   |
|----------------|------------------------|------------|
| Admin          | admin@company.com      | Admin@123  |
| Team Lead      | rajesh@company.com     | Admin@123  |
| Developer      | alice@company.com      | User@123   |
| HR Manager     | bob@company.com        | User@123   |
| Finance        | carol@company.com      | User@123   |
| Operations     | dave@company.com       | User@123   |

## Product

30+ module enterprise system with 5 roles:
- **Dashboard** — stat cards, team tickets table, notifications panel, calendar panel
- **Ticket Management** — raise, assign, forward, status tracking, SLA monitoring, comments
- **Common Worklist** — unassigned ticket pool, LIFO pick
- **Project Management** — progress tracking, collaborators, status timeline
- **To-Do Management** — personal & team todos, convert to ticket
- **Calendar** — events, meetings, reminders
- **Timesheets** — daily log, weekly summary
- **User Management** — CRUD with department/role assignment
- **Settings & Masters** — departments, roles, categories
- **Audit Logs** — searchable activity trail
- **Notifications** — real-time via Socket.io

## Gotchas

- After changing `lib/db/src/schema/`, always run `pnpm run typecheck:libs` before running API server typecheck, or you'll get false "no exported member" errors.
- The seed script uses `.onConflictDoNothing()` — safe to re-run multiple times.
- Socket.io cors is set to `*` for dev. Lock this down in production.
- Express 5 params are `string | string[]` — always parse with `Array.isArray` check before `parseInt`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
