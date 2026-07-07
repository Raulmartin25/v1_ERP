"use client";

import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@erp/shared";
import { OrdersApi } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  VOID: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800",
};

export default function OrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: OrdersApi.list });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-neutral-500">Most recent 100 orders.</p>

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
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-3" colSpan={6}>
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
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-neutral-400" colSpan={6}>
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
