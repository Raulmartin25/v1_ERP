# Business Logic & Domain Model

How the ERP thinks about menus, orders, money, and the books. This is the
"why it's correct" companion to the code.

---

## 1. Money: the golden rule

**All monetary amounts are stored as integers in minor units (cents).** Never
floats. This eliminates floating-point drift in financial math.

Helpers live in `@erp/shared` (`packages/shared/src/money.ts`):

| Helper | Purpose |
|--------|---------|
| `toCents(12.34) → 1234` | dollars → cents |
| `fromCents(1234) → 12.34` | cents → dollars |
| `formatMoney(1234) → "$12.34"` | display formatting |
| `taxOf(cents, bps)` | tax portion, rounded to the cent |
| `sumCents([...])` | safe integer sum |

**One deliberate exception:** an ingredient's `costPerUnit` is a
`Decimal(12,4)` of **cents**, not an integer. Bulk ingredients cost a fraction of
a cent per gram (e.g. potato ≈ 0.4¢/g); rounding that to an integer would zero it
out. Precision is kept on the *input*, and money is rounded to whole cents only
when a **recipe total** or **line total** is computed.

---

## 2. Menu & Recipe

### Entities
- **Ingredient** — `name`, `unit` (g/ml/unit), `costPerUnit` (¢/unit, decimal), `stockQty`.
- **MenuItem** — `name`, `category`, `price` (¢), `isActive`; optionally one **Recipe**.
- **Recipe** → **RecipeLine[]** — each line is an ingredient + `quantity` (in that ingredient's unit).
- **ModifierGroup** → **Modifier[]** — e.g. "Extras" → {Extra cheese +$1.00, Bacon +$1.50}. Groups attach to menu items (many-to-many via `MenuItemModifier`).

### Recipe cost & food-cost %
Computed in `MenuService.withCost`:

```
recipeCost (¢) = round( Σ  line.quantity × ingredient.costPerUnit )
foodCostPct    = recipeCost / menuItem.price × 100
```

Food cost % is the core menu-engineering metric. Restaurant targets are
typically **~28–32%**; the UI colours the badge green (≤30%), amber (≤38%), or
red (above).

> The recipe cost is computed on read from *current* ingredient prices — change an
> ingredient cost and every dish using it re-prices immediately.

---

## 3. POS / Orders

### Order lifecycle
```
        create                pay
  ──▶  OPEN  ─────────────▶  PAID
         │
         └──── void ────▶  VOID     (only before payment)
```
`SENT` and `CLOSED` exist in the schema for future kitchen/close flows but are not
yet used by the v1 API.

### Entities
- **Order** — `number` (auto-increment), `channel` (DINE_IN/TAKEAWAY/DELIVERY), `status`, optional `table`, plus `subtotal` / `taxTotal` / `total` (¢).
- **OrderLine** — a sold item with **snapshotted** `nameSnapshot`, `unitPrice`, `lineTotal`, `qty`.
- **OrderLineModifier** — snapshotted `nameSnapshot`, `priceDelta`.
- **Payment** — `method` (CASH/CARD), `amount`.

### Pricing is server-authoritative (key invariant)
The client sends only *what* was ordered (menu-item IDs, quantities, modifier
IDs). The server (`OrdersService.create`) looks up prices from the database and
computes everything itself:

```
lineUnitPrice = menuItem.price + Σ modifier.priceDelta
lineTotal     = lineUnitPrice × qty
subtotal      = Σ lineTotal
taxTotal      = taxOf(subtotal, TAX_RATE_BPS)      # default 8%
total         = subtotal + taxTotal
```

Prices and names are **snapshotted onto the order** at creation, so later menu
edits never rewrite the history of a placed order.

> **A tampered client cannot change what is charged** — it has no say over prices.

### Payment
`POST /api/orders/:id/pay` records a Payment for the full `total`, flips status to
`PAID`, **and posts the accounting entry — all in one database transaction.**
Paying twice is rejected (400); voiding a paid order is rejected.

---

## 4. Finance & Accounting (double-entry ledger)

### Why double-entry
Every transaction touches at least two accounts, and **debits always equal
credits**. This makes the books self-checking: the trial balance must sum to
zero-difference, or something is wrong. All reports derive from this one ledger —
a single source of truth.

### Chart of accounts (seeded)
| Code | Account | Type | Normal side |
|------|---------|------|-------------|
| 1000 | Cash | Asset | Debit |
| 1010 | Card Clearing | Asset | Debit |
| 1200 | Inventory | Asset | Debit |
| 2000 | Tax Payable | Liability | Credit |
| 3000 | Owner's Equity | Equity | Credit |
| 4000 | Sales Revenue | Revenue | Credit |
| 5000 | Cost of Goods Sold | Expense | Debit |

### The posting for a paid order
`LedgerService.postForOrder` writes one balanced `JournalEntry` (idempotent per
order):

```
Dr  Cash (1000) or Card Clearing (1010)   total
    Cr  Sales Revenue (4000)                   subtotal
    Cr  Tax Payable (2000)                      tax
Dr  Cost of Goods Sold (5000)             cogs
    Cr  Inventory (1200)                        cogs
```

**Balanced by construction:** debits `= total + cogs`, credits
`= subtotal + tax + cogs = total + cogs`.

`cogs` = Σ (recipe cost of each line's menu item × qty) — this is what connects
the **Menu module's recipe costing into the financial statements**, giving a real
gross margin.

### Reports (all ledger-derived)
- **Trial balance** (`GET /api/accounts`) — every account's debit/credit totals and
  signed balance, plus a `balanced` flag (Σdebit = Σcredit).
- **Sales / Z-report** (`GET /api/reports/sales`) — gross sales (Cr 4000), tax
  (Cr 2000), collected by method (Dr 1000 / 1010), order count.
- **P&L** (`GET /api/reports/pnl`) — revenue (Cr 4000) − COGS (Dr 5000) = gross
  profit, and margin %.

Reports accept optional `?from=&to=` ISO timestamps (filtered on entry date);
absent = all time.

---

## 5. Invariants worth protecting

These are the properties that make the system trustworthy. Keep them true as the
code evolves:

1. **Money is integer cents** everywhere it is stored or transferred (ingredient
   unit-cost being the one decimal-cents exception).
2. **Order pricing is computed server-side** from the database, never trusted from
   the client.
3. **Order lines snapshot price and name** at sale time.
4. **Every paid order produces exactly one balanced journal entry**, written in the
   same transaction as the payment.
5. **Debits equal credits** in every journal entry and in the trial balance.
6. **Tax rate has a single source of truth** (`DEFAULT_TAX_BPS`, override via
   `TAX_RATE_BPS`).

---

## 6. Known simplifications in v1

Accurate accounting/inventory would tighten these later (see `ROADMAP.md`):

- **COGS uses *current* recipe cost**, not a cost snapshot captured at sale time —
  changing ingredient prices retroactively shifts historical COGS.
- **Inventory is credited but never decremented** on sale — `stockQty` on
  ingredients is not consumed, and the Inventory account will trend negative
  because nothing debits it (no purchasing flow yet).
- **Single flat tax rate**, no tax-exempt items or multiple jurisdictions.
- **No discounts, refunds, tips, or partial/split payments.**
- **No period close** — reports are live, not locked.
