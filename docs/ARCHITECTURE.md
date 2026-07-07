# Architecture & Infrastructure

Technical reference for how the Restaurant ERP prototype is built, wired, and run.

---

## 1. Stack overview

100% free / open-source, full-stack TypeScript.

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router) + React 19 | Server + client components |
| UI | Tailwind CSS 3 | Utility styling, light/dark aware |
| Data fetching | TanStack Query 5 | Client-side cache + mutations |
| Backend | NestJS 10 | Modular REST API |
| ORM | Prisma 6 | Type-safe DB access + migrations |
| Database | PostgreSQL 16 | Runs in Docker |
| Validation | class-validator / class-transformer | On API DTOs |
| Shared code | TypeScript package | Money helpers, enums, tax constant |
| Monorepo | pnpm workspaces | One repo, shared types |
| Runtime | Node.js ≥ 18.18 | Verified on 18.20 |

---

## 2. Monorepo layout

```
erp_test_v1/
├── apps/
│   ├── api/                 @erp/api  — NestJS REST API (port 4000)
│   │   └── src/
│   │       ├── main.ts          bootstrap, CORS, /api global prefix
│   │       ├── app.module.ts     root module (registers all feature modules)
│   │       ├── prisma/           PrismaService (injectable DB client)
│   │       ├── health/           GET /api/health
│   │       ├── ingredients/      Ingredients CRUD
│   │       ├── menu/             Menu items + recipe + cost calc
│   │       ├── modifiers/        Modifier groups + attach/detach
│   │       ├── orders/           Order create / pay / void
│   │       ├── tables/           GET /api/tables
│   │       ├── ledger/           Double-entry posting + trial balance
│   │       └── reports/          Sales (Z-report) + P&L
│   └── web/                 @erp/web  — Next.js app (port 3000)
│       └── src/
│           ├── app/             routes: /, /pos, /orders, /finance, /menu, /ingredients
│           ├── components/      shared UI (nav)
│           └── lib/api.ts       typed API client
├── packages/
│   ├── shared/              @erp/shared — money helpers, domain enums, DEFAULT_TAX_BPS
│   └── db/                  @erp/db     — Prisma schema, generated client, migrations, seed
├── docker-compose.yml       PostgreSQL service
├── .env / .env.example      environment configuration
└── pnpm-workspace.yaml
```

### Package dependency direction

```
apps/web  ──▶ @erp/shared
apps/api  ──▶ @erp/shared, @erp/db
@erp/db   ──▶ @erp/shared
```

Web never imports `@erp/db` — it talks to the API over HTTP only. This keeps the
database out of the browser bundle.

---

## 3. Build & module resolution

`@erp/shared` and `@erp/db` compile to CommonJS `dist/` (`tsc`), and their
`package.json` `main`/`types` point there. NestJS (CommonJS) and Next.js both
consume the compiled output, which sidesteps cross-package TS-source resolution
issues in pnpm workspaces.

- Root script `pnpm build:packages` builds `@erp/shared` then `@erp/db`
  (the latter runs `prisma generate` first).
- `pnpm dev` and `pnpm dev:api` run `build:packages` before starting apps, so the
  `dist/` outputs always exist.
- The API is a **CommonJS Nest app** (`apps/api/tsconfig.json` sets
  `declaration: false` — apps are not libraries, which avoids the Prisma
  "portable type" TS2742 errors).

> ⚠️ If you edit `@erp/shared` or the Prisma schema, restart the API
> (`pnpm dev:api`) so the rebuilt packages/regenerated client are picked up.

---

## 4. Runtime topology

```
┌────────────┐   HTTP/JSON    ┌──────────────┐   Prisma/TCP   ┌──────────────┐
│  Next.js   │ ─────────────▶ │   NestJS API │ ─────────────▶ │  PostgreSQL  │
│  :3000     │  /api/*        │   :4000      │                │  :5432 (docker)│
└────────────┘                └──────────────┘                └──────────────┘
```

- API is mounted under the global prefix **`/api`** (e.g. `/api/orders`).
- CORS is open (`origin: true`) for local development.
- The web app reads `NEXT_PUBLIC_API_URL` to reach the API (default
  `http://localhost:4000`).

---

## 5. Environment variables

Copy `.env.example` to `.env`. The API loads it from the repo root
(`ConfigModule` with `envFilePath: ["../../.env", ".env"]`); Prisma CLI commands
load it via `dotenv-cli`.

| Variable | Used by | Default | Purpose |
|----------|---------|---------|---------|
| `DATABASE_URL` | API, Prisma | `postgresql://erp:erp@localhost:5432/erp?schema=public` | DB connection |
| `API_PORT` | API | `4000` | API listen port |
| `NEXT_PUBLIC_API_URL` | Web | `http://localhost:4000` | API base URL (browser) |
| `TAX_RATE_BPS` | API (optional) | `800` (from `@erp/shared`) | Sales-tax rate in basis points |

The tax rate lives in `@erp/shared` as `DEFAULT_TAX_BPS = 800` so the POS cart
preview (web) and the authoritative calculation (API) never disagree; the API may
override it via `TAX_RATE_BPS`.

---

## 6. Database & migrations

- Postgres runs via `docker-compose.yml` (service `db`, volume `erp_pgdata`,
  healthcheck on `pg_isready`).
- Schema is defined in `packages/db/prisma/schema.prisma`.
- Migrations live in `packages/db/prisma/migrations/`.

| Command | Action |
|---------|--------|
| `pnpm db:up` | Start Postgres container |
| `pnpm db:down` | Stop Postgres |
| `pnpm db:migrate` | Create + apply a dev migration (`prisma migrate dev`) |
| `pnpm db:seed` | Load chart of accounts + demo menu/ingredients/tables |
| `pnpm db:studio` | Open Prisma Studio (DB GUI) |
| `pnpm db:generate` | Regenerate the Prisma client |

> **Non-interactive note:** widening/altering columns triggers Prisma's
> interactive data-loss prompt, which fails in CI/non-TTY shells. In that case
> hand-write the migration SQL under `prisma/migrations/<timestamp>_<name>/` and
> apply with `prisma migrate deploy` (see the `ingredient_cost_decimal` migration
> as an example).

---

## 7. Local run — from zero

```bash
# 0. Prereqs: Node ≥ 18.18, Docker running, pnpm (via `corepack enable pnpm`)
pnpm install
cp .env.example .env

# 1. Database
pnpm db:up          # start Postgres
pnpm db:migrate     # apply schema
pnpm db:seed        # demo data

# 2. Apps (api :4000, web :3000)
pnpm dev
```

Health check: `curl http://localhost:4000/api/health` → `{"status":"ok","db":"up"}`.
App: open http://localhost:3000.

Individual apps: `pnpm dev:api` / `pnpm dev:web`.

---

## 8. Verification tooling

- **Headless Chrome** (`--dump-dom` / `--screenshot`) is used to confirm pages
  render live data after client-side fetch.
- **puppeteer-core** (root devDependency) drives real interactive flows (e.g. the
  full POS place-and-pay path) against the installed Chrome.

There is no automated test suite yet — see the roadmap.

---

## 9. Ports summary

| Service | Port | URL |
|---------|------|-----|
| Web | 3000 | http://localhost:3000 |
| API | 4000 | http://localhost:4000/api |
| PostgreSQL | 5432 | `postgresql://erp:erp@localhost:5432/erp` |
