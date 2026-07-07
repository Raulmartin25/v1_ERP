"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatMoney } from "@erp/shared";
import { OrdersApi } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  VOID: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800",
};

// Ledger-derived views that change when an order is paid.
const FINANCE_KEYS = [["orders"], ["accounts"], ["ledger"], ["sales"], ["pnl"]];

export default function OrdersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: OrdersApi.list });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => FINANCE_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));

  const pay = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) => OrdersApi.pay(id, method),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const voidOrder = useMutation({
    mutationFn: (id: string) => OrdersApi.void(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const busy = pay.isPending || voidOrder.isPending;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Most recent 100 orders. Open orders can be paid or voided here.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Items</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-3" colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {data?.map((o) => (
              <tr key={o.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-2.5 font-medium">{o.number}</td>
                <td className="px-4 py-2.5 text-neutral-500">
                  {o.channel.replace("_", "-").toLowerCase()}
                  {o.table && ` · T${o.table.number}`}
                </td>
                <td className="px-4 py-2.5 text-neutral-500">
                  {o.lines.reduce((n, l) => n + l.qty, 0)} items
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[o.status] ?? ""
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(o.total)}</td>
                <td className="px-4 py-2.5 text-neutral-400">
                  {new Date(o.createdAt).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  {o.status === "OPEN" ? (
                    <span className="inline-flex items-center gap-2">
                      <button
                        disabled={busy}
                        onClick={() => pay.mutate({ id: o.id, method: "CASH" })}
                        className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        Cash
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => pay.mutate({ id: o.id, method: "CARD" })}
                        className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
                      >
                        Card
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => voidOrder.mutate(o.id)}
                        className="text-xs text-red-600 hover:underline disabled:opacity-40"
                      >
                        Void
                      </button>
                    </span>
                  ) : (
                    <span className="text-neutral-300 dark:text-neutral-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-neutral-400" colSpan={7}>
                  No orders yet. Take one in the POS.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
