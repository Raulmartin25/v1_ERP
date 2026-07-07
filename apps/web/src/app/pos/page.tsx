"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  DEFAULT_TAX_BPS,
  OrderChannel,
  formatMoney,
  sumCents,
  taxOf,
} from "@erp/shared";
import {
  MenuApi,
  OrdersApi,
  TablesApi,
  type MenuItem,
  type Modifier,
  type Order,
} from "@/lib/api";

type CartLine = {
  key: number;
  item: MenuItem;
  qty: number;
  modifiers: Modifier[];
};

const CHANNELS = [
  { value: OrderChannel.DINE_IN, label: "Dine-in" },
  { value: OrderChannel.TAKEAWAY, label: "Takeaway" },
  { value: OrderChannel.DELIVERY, label: "Delivery" },
];

export default function PosPage() {
  const qc = useQueryClient();
  const menu = useQuery({ queryKey: ["menu"], queryFn: MenuApi.list });
  const tables = useQuery({ queryKey: ["tables"], queryFn: TablesApi.list });

  const [channel, setChannel] = useState<string>(OrderChannel.DINE_IN);
  const [tableId, setTableId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picker, setPicker] = useState<MenuItem | null>(null);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useState(() => ({ n: 1 }))[0];

  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const m of menu.data ?? []) {
      if (!m.isActive) continue;
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return [...map.entries()];
  }, [menu.data]);

  const lineUnit = (l: CartLine) =>
    l.item.price + sumCents(l.modifiers.map((m) => m.priceDelta));
  const lineTotal = (l: CartLine) => lineUnit(l) * l.qty;
  const subtotal = sumCents(cart.map(lineTotal));
  const tax = taxOf(subtotal, DEFAULT_TAX_BPS);
  const total = subtotal + tax;

  function addItem(item: MenuItem, modifiers: Modifier[]) {
    setCart((c) => [...c, { key: keyRef.n++, item, qty: 1, modifiers }]);
  }

  function onItemClick(item: MenuItem) {
    if (item.modifierLinks.length > 0) setPicker(item);
    else addItem(item, []);
  }

  function setQty(key: number, delta: number) {
    setCart((c) =>
      c
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  const place = useMutation({
    mutationFn: () =>
      OrdersApi.create({
        channel,
        tableId: channel === OrderChannel.DINE_IN && tableId ? tableId : undefined,
        lines: cart.map((l) => ({
          menuItemId: l.item.id,
          qty: l.qty,
          modifierIds: l.modifiers.map((m) => m.id),
        })),
      }),
    onSuccess: (order) => {
      setPlaced(order);
      setCart([]);
      setError(null);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const pay = useMutation({
    mutationFn: (method: string) => OrdersApi.pay(placed!.id, method),
    onSuccess: (order) => {
      setPlaced(order);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function newOrder() {
    setPlaced(null);
    setError(null);
    setTableId("");
  }

  // ---- Payment / receipt view ----
  if (placed) {
    const paid = placed.status === "PAID";
    return (
      <main className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Order #{placed.number}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                paid
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              {placed.status}
            </span>
          </div>
          <ul className="mt-4 space-y-1 text-sm">
            {placed.lines.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>
                  {l.qty}× {l.nameSnapshot}
                  {l.modifiers.length > 0 && (
                    <span className="text-neutral-400">
                      {" "}
                      ({l.modifiers.map((m) => m.nameSnapshot).join(", ")})
                    </span>
                  )}
                </span>
                <span className="tabular-nums">{formatMoney(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
            <Row label="Subtotal" value={formatMoney(placed.subtotal)} />
            <Row label="Tax" value={formatMoney(placed.taxTotal)} />
            <Row label="Total" value={formatMoney(placed.total)} bold />
          </div>

          {!paid ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => pay.mutate("CASH")}
                disabled={pay.isPending}
                className="rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              >
                Pay cash
              </button>
              <button
                onClick={() => pay.mutate("CARD")}
                disabled={pay.isPending}
                className="rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Pay card
              </button>
            </div>
          ) : (
            <div className="mt-6 text-center text-sm text-green-600">
              Paid by {placed.payments[0]?.method.toLowerCase()} ✓
            </div>
          )}
          <button
            onClick={newOrder}
            className="mt-4 w-full rounded-lg border border-neutral-300 py-2.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            New order
          </button>
          {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
        </div>
      </main>
    );
  }

  // ---- Order-taking view ----
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
      {/* Menu grid */}
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">POS</h1>
        {menu.isLoading && <p className="mt-4 text-sm text-neutral-500">Loading menu…</p>}
        {categories.map(([cat, items]) => (
          <div key={cat} className="mt-6">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {cat}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className="rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {formatMoney(item.price)}
                    {item.modifierLinks.length > 0 && " · options"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Cart */}
      <aside className="lg:sticky lg:top-6 lg:h-fit">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex gap-1">
            {CHANNELS.map((c) => (
              <button
                key={c.value}
                onClick={() => setChannel(c.value)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                  channel === c.value
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {channel === OrderChannel.DINE_IN && (
            <select
              className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
            >
              <option value="">No table</option>
              {tables.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.number} · {t.area}
                </option>
              ))}
            </select>
          )}

          <ul className="mt-4 space-y-2">
            {cart.length === 0 && (
              <li className="py-6 text-center text-sm text-neutral-400">
                Tap items to add
              </li>
            )}
            {cart.map((l) => (
              <li key={l.key} className="flex items-start gap-2 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{l.item.name}</div>
                  {l.modifiers.length > 0 && (
                    <div className="text-xs text-neutral-400">
                      {l.modifiers.map((m) => m.name).join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <QtyBtn onClick={() => setQty(l.key, -1)}>−</QtyBtn>
                  <span className="w-5 text-center tabular-nums">{l.qty}</span>
                  <QtyBtn onClick={() => setQty(l.key, 1)}>+</QtyBtn>
                </div>
                <div className="w-16 text-right tabular-nums">{formatMoney(lineTotal(l))}</div>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
            <Row label="Subtotal" value={formatMoney(subtotal)} />
            <Row label={`Tax (${DEFAULT_TAX_BPS / 100}%)`} value={formatMoney(tax)} />
            <Row label="Total" value={formatMoney(total)} bold />
          </div>

          <button
            onClick={() => place.mutate()}
            disabled={cart.length === 0 || place.isPending}
            className="mt-4 w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {place.isPending ? "Placing…" : "Place order"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </aside>

      {picker && (
        <ModifierPicker
          item={picker}
          onCancel={() => setPicker(null)}
          onConfirm={(mods) => {
            addItem(picker, mods);
            setPicker(null);
          }}
        />
      )}
    </main>
  );
}

function ModifierPicker({
  item,
  onCancel,
  onConfirm,
}: {
  item: MenuItem;
  onCancel: () => void;
  onConfirm: (mods: Modifier[]) => void;
}) {
  const [selected, setSelected] = useState<Record<string, Modifier>>({});
  const toggle = (m: Modifier) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[m.id]) delete next[m.id];
      else next[m.id] = m;
      return next;
    });

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold">{item.name}</h3>
        {item.modifierLinks.map(({ group }) => (
          <div key={group.id} className="mt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {group.name}
            </div>
            <div className="space-y-1">
              {group.modifiers.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected[m.id]}
                      onChange={() => toggle(m)}
                    />
                    {m.name}
                  </span>
                  {m.priceDelta !== 0 && (
                    <span className="tabular-nums text-neutral-500">
                      {m.priceDelta > 0 ? "+" : ""}
                      {formatMoney(m.priceDelta)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Object.values(selected))}
            className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function QtyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-6 w-6 rounded-md border border-neutral-300 text-sm leading-none hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-neutral-500"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
