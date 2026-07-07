# Restaurant ERP (prototype)

A free, open-source restaurant ERP prototype. v1 modules:

- **POS / Orders** — take orders, apply modifiers, capture payments
- **Menu & Recipe** — menu items, recipes, ingredients, food-cost %
- **Finance & Accounting** — double-entry ledger, auto-posted from sales

## Stack

Full-stack TypeScript, 100% free/OSS:

| Layer | Tech |
|-------|------|
| Frontend | Next.js, React, Tailwind, shadcn/ui, TanStack Query |
| Backend | NestJS |
| Database | PostgreSQL (Docker) |
| ORM | Prisma |
| Validation | Zod (shared FE/BE) |
| Monorepo | pnpm workspaces |

## Layout

```
apps/
  web/    Next.js UI (POS, admin, dashboards)
  api/    NestJS REST API
packages/
  shared/ Zod schemas, types, money helpers
  db/     Prisma schema, migrations, seed
```

## Getting started

```bash
# 1. Install deps
pnpm install

# 2. Start PostgreSQL
cp .env.example .env
pnpm db:up

# 3. Create schema + seed demo data
pnpm db:migrate
pnpm db:seed

# 4. Run everything
pnpm dev            # api on :4000, web on :3000
```

## Conventions

- **Money is stored in integer minor units** (cents). Never floats.
- **Order → ledger** posting runs inside a DB transaction.
- Modules are decoupled; Finance reacts to order events.

## Documentation

| Doc | What's inside |
|-----|---------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, monorepo layout, build/resolution, runtime topology, env vars, database & migrations, how to run, ports |
| [docs/BUSINESS_LOGIC.md](docs/BUSINESS_LOGIC.md) | Money model, recipe costing & food-cost %, order pricing rules, the double-entry ledger, invariants, v1 simplifications |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Current status, known gaps, phased future work, production-readiness checklist, how-to-extend guide |

## Modules (v1)

| Module | Status | Web |
|--------|--------|-----|
| POS / Orders | ✅ | `/pos`, `/orders` |
| Menu & Recipe | ✅ | `/menu`, `/ingredients` |
| Finance & Accounting | ✅ | `/finance` |
