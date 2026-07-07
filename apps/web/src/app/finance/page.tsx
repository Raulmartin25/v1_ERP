"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatMoney } from "@erp/shared";
import { FinanceApi } from "@/lib/api";

type Period = "today" | "all";

export default function FinancePage() {
  const [period, setPeriod] = useState<Period>("all");

  const sales = useQuery({ queryKey: ["sales", period], queryFn: () => FinanceApi.sales(period) });
  const pnl = useQuery({ queryKey: ["pnl", period], queryFn: () => FinanceApi.pnl(period) });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: FinanceApi.accounts });
  const ledger = useQuery({ queryKey: ["ledger"], queryFn: FinanceApi.ledger });

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Reports derived from the double-entry ledger.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {(["today", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                period === p
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white"
                  : "text-neutral-500"
              }`}
            >
              {p === "all" ? "All time" : "Today"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Gross sales" value={money(sales.data?.grossSales)} />
        <Tile label="Orders" value={sales.data ? String(sales.data.orderCount) : "—"} />
        <Tile
          label="Gross profit"
          value={money(pnl.data?.grossProfit)}
          accent="good"
          sub={pnl.data?.marginPct != null ? `${pnl.data.marginPct}% margin` : undefined}
        />
        <Tile label="Tax collected" value={money(sales.data?.tax)} sub="liability" />
      </section>

      {/* P&L + payment split */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Panel title="Profit & loss">
          <Line label="Revenue" value={money(pnl.data?.revenue)} />
          <Line label="Cost of goods sold" value={money(pnl.data?.cogs, true)} />
          <Line label="Gross profit" value={money(pnl.data?.grossProfit)} strong />
        </Panel>
        <Panel title="Collected by method">
          <Line label="Cash" value={money(sales.data?.byMethod.cash)} />
          <Line label="Card" value={money(sales.data?.byMethod.card)} />
          <Line label="Total collected" value={money(sales.data?.totalCollected)} strong />
        </Panel>
      </section>

      {/* Trial balance */}
      <section className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-medium">Trial balance</h2>
          {accounts.data && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                accounts.data.balanced
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              }`}
            >
              {accounts.data.balanced ? "Balanced ✓" : "Out of balance!"}
            </span>
          )}
        </div>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Debit</th>
                <th className="px-4 py-2 text-right font-medium">Credit</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data?.rows.map((a) => (
                <tr key={a.code} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2">
                    <span className="text-neutral-400">{a.code}</span> {a.name}
                  </td>
                  <td className="px-4 py-2 text-xs text-neutral-500">{a.type}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{a.debit ? formatMoney(a.debit) : "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{a.credit ? formatMoney(a.credit) : "—"}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">{formatMoney(a.balance)}</td>
                </tr>
              ))}
            </tbody>
            {accounts.data && (
              <tfoot>
                <tr className="border-t border-neutral-200 font-medium dark:border-neutral-700">
                  <td className="px-4 py-2" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(accounts.data.totalDebit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(accounts.data.totalCredit)}</td>
                  <td className="px-4 py-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Journal */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium">Journal entries</h2>
        <div className="space-y-2">
          {ledger.data?.length === 0 && (
            <p className="text-sm text-neutral-400">No entries yet — take and pay an order.</p>
          )}
          {ledger.data?.map((e) => (
            <div key={e.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="font-medium">{e.description}</span>
                <span className="text-xs text-neutral-400">
                  {new Date(e.date).toLocaleTimeString()}
                </span>
              </div>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {e.lines.map((l, i) => (
                    <tr key={i} className="text-neutral-600 dark:text-neutral-300">
                      <td className="py-0.5">{l.account}</td>
                      <td className="w-24 py-0.5 text-right tabular-nums">
                        {l.debit ? formatMoney(l.debit) : ""}
                      </td>
                      <td className="w-24 py-0.5 text-right tabular-nums">
                        {l.credit ? formatMoney(l.credit) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function money(cents: number | undefined, paren = false): string {
  if (cents == null) return "—";
  const s = formatMoney(cents);
  return paren && cents > 0 ? `(${s})` : s;
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "good";
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          accent === "good" ? "text-green-600 dark:text-green-400" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between border-t border-neutral-100 pt-1.5 text-sm first:border-0 first:pt-0 dark:border-neutral-800 ${
        strong ? "font-semibold" : "text-neutral-600 dark:text-neutral-300"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
