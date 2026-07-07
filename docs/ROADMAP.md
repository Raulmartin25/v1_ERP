# Roadmap & Future Development

Where the prototype is, and a prioritized path forward.

---

## Status — v1 (feature-complete)

The three modules requested for v1 are built and verified end-to-end.

| Module | Status | Surface |
|--------|--------|---------|
| POS / Orders | ✅ Done | `/pos`, `/orders`; orders API with server-side pricing + payment |
| Menu & Recipe | ✅ Done | `/menu`, `/ingredients`; recipes, cost + food-cost % |
| Finance & Accounting | ✅ Done | `/finance`; double-entry ledger, trial balance, P&L, Z-report |

Foundation: pnpm monorepo, PostgreSQL (Docker), Prisma, NestJS API, Next.js UI,
shared types.

---

## Known gaps / debt (carried from v1)

Ordered roughly by how much they affect correctness:

1. **COGS cost snapshot** — capture each line's cost at sale time (store `unitCost`
   on `OrderLine`) so historical COGS/margin is immutable. *(Correctness)*
2. **Inventory depletion** — decrement `Ingredient.stockQty` when an order is paid,
   and add a **Purchasing** flow that debits Inventory, so the Inventory account
   and stock levels are real. *(Correctness)*
3. **No authentication / authorization** — anyone can hit any endpoint. Needed
   before any shared or hosted use. *(Security)*
4. **No automated tests** — only manual + headless-browser verification today.
   *(Quality)*
5. **No order editing / refunds / voids from the UI** — the API supports create /
   pay / void; the UI only does create + pay. *(Completeness)*
6. **Single flat tax rate**, no discounts, tips, or split payments. *(Completeness)*

---

## Phase 4 — Polish (suggested next)

- **Auth & roles**: login (e.g. JWT), roles like *cashier / manager / admin*, and
  route guards. Manager-only access to Finance and menu editing.
- **Unified home dashboard**: today's sales, order count, top items, low-margin
  dishes — a landing view over all modules.
- **Order actions in the UI**: reopen/void, reprint receipt, view an order's
  journal entry.

## Phase 5 — Harden the core

- **Cost snapshots** on order lines (gap #1).
- **Inventory depletion + Purchasing** module (gap #2): purchase orders, receiving,
  supplier records; Inventory account driven by real receipts.
- **Automated tests**: unit tests for pricing/tax/ledger math, e2e for the POS→
  ledger flow (Vitest + Playwright).
- **Period close**: lock a day/month, generate an immutable Z-report snapshot.

## Phase 6 — New modules (pick by need)

- **Kitchen Display (KDS)**: route paid/sent orders to a kitchen screen; use the
  `SENT`/`CLOSED` statuses already in the schema; real-time via WebSocket/SSE.
- **Tables & floor management**: table status, open tabs, transfers, split checks.
- **CRM & loyalty**: customers, reservations, promotions, discounts.
- **Reporting & analytics**: trends over time, menu-engineering matrix
  (popularity × margin), labour vs sales. *(Add charts per the dataviz guidance.)*
- **Staff / scheduling / payroll**.
- **Multi-location**: tenant scoping, per-site menus and books.

---

## Production-readiness checklist (before real use)

Not needed for a prototype, but the shortlist when it graduates:

- [ ] Authentication + authorization on every endpoint
- [ ] Secrets management (no plaintext `.env`; rotate the DB password)
- [ ] Database backups + migration strategy for production (`migrate deploy`)
- [ ] Input hardening + rate limiting on the API
- [ ] Structured logging, error tracking, health/metrics endpoints
- [ ] CI pipeline: typecheck, tests, build
- [ ] Containerize the apps (Dockerfiles) and a deploy target
- [ ] HTTPS / reverse proxy; restrict CORS to known origins
- [ ] Money/accounting review by someone with bookkeeping domain knowledge

---

## How to extend — quick guide

**Add an API resource:** create `apps/api/src/<feature>/` with `dto.ts`,
`<feature>.service.ts`, `<feature>.controller.ts`, `<feature>.module.ts`, then
register the module in `app.module.ts`. Inject `PrismaService` for DB access.

**Change the schema:** edit `packages/db/prisma/schema.prisma` → `pnpm db:migrate`
→ restart the API. Add seed data in `packages/db/prisma/seed.ts`.

**Add a web page:** create `apps/web/src/app/<route>/page.tsx`, add a typed client
method in `apps/web/src/lib/api.ts`, and a link in `apps/web/src/components/nav.tsx`.

**Share a value between API and web:** put it in `@erp/shared` (like
`DEFAULT_TAX_BPS`) so both sides agree; rebuild with `pnpm build:packages`.
