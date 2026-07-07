"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatMoney } from "@erp/shared";
import { IngredientsApi, MenuApi, type MenuItem } from "@/lib/api";

export default function MenuPage() {
  const qc = useQueryClient();
  const menu = useQuery({ queryKey: ["menu"], queryFn: MenuApi.list });
  const ingredients = useQuery({ queryKey: ["ingredients"], queryFn: IngredientsApi.list });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: MenuApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu"] });
      setName("");
      setCategory("");
      setPrice("");
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const remove = useMutation({
    mutationFn: MenuApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu"] }),
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Recipe cost and food-cost % are computed from ingredient prices.
      </p>

      <form
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            name: name.trim(),
            category: category.trim() || "Uncategorized",
            price: Math.round(Number(price) * 100),
          });
        }}
      >
        <Field label="Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Category">
          <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Price ($)">
          <input
            className={inputCls}
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </Field>
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {create.isPending ? "Adding…" : "Add item"}
        </button>
      </form>
      {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
            <tr>
              <Th>Item</Th>
              <Th>Category</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">Cost</Th>
              <Th className="text-right">Food&nbsp;cost</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {menu.isLoading && (
              <tr>
                <Td colSpan={6}>Loading…</Td>
              </tr>
            )}
            {menu.data?.map((item) => (
              <RowGroup
                key={item.id}
                item={item}
                expanded={expanded === item.id}
                onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                onDelete={() => remove.mutate(item.id)}
                ingredients={ingredients.data ?? []}
              />
            ))}
            {menu.data?.length === 0 && (
              <tr>
                <Td colSpan={6} className="text-neutral-400">
                  No menu items yet.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function RowGroup({
  item,
  expanded,
  onToggle,
  onDelete,
  ingredients,
}: {
  item: MenuItem;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  ingredients: { id: string; name: string; unit: string }[];
}) {
  return (
    <>
      <tr className="border-t border-neutral-100 dark:border-neutral-800">
        <Td className="font-medium">{item.name}</Td>
        <Td className="text-neutral-500">{item.category}</Td>
        <Td className="text-right tabular-nums">{formatMoney(item.price)}</Td>
        <Td className="text-right tabular-nums">{formatMoney(item.costCents)}</Td>
        <Td className="text-right">
          <FoodCostBadge pct={item.foodCostPct} />
        </Td>
        <Td className="text-right whitespace-nowrap">
          <button onClick={onToggle} className="text-xs text-blue-600 hover:underline">
            {expanded ? "Close" : "Recipe"}
          </button>
          <button onClick={onDelete} className="ml-3 text-xs text-red-600 hover:underline">
            Delete
          </button>
        </Td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-neutral-50 px-4 py-4 dark:bg-neutral-900/50">
            <RecipeEditor item={item} ingredients={ingredients} />
          </td>
        </tr>
      )}
    </>
  );
}

function FoodCostBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-neutral-400">—</span>;
  // Restaurant target is typically ~28–32%.
  const color =
    pct <= 30
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
      : pct <= 38
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${color}`}>
      {pct}%
    </span>
  );
}

type EditLine = { ingredientId: string; quantity: string };

function RecipeEditor({
  item,
  ingredients,
}: {
  item: MenuItem;
  ingredients: { id: string; name: string; unit: string }[];
}) {
  const qc = useQueryClient();
  const [lines, setLines] = useState<EditLine[]>(
    item.recipe?.lines.map((l) => ({
      ingredientId: l.ingredientId,
      quantity: String(Number(l.quantity)),
    })) ?? [],
  );

  const save = useMutation({
    mutationFn: () =>
      MenuApi.setRecipe(item.id, {
        lines: lines
          .filter((l) => l.ingredientId && l.quantity)
          .map((l) => ({ ingredientId: l.ingredientId, quantity: Number(l.quantity) })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu"] }),
  });

  const unitOf = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? "";

  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Recipe · {item.name}
      </div>
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              className={inputCls}
              value={line.ingredientId}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((l, i) => (i === idx ? { ...l, ingredientId: e.target.value } : l)),
                )
              }
            >
              <option value="">Select ingredient…</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </select>
            <input
              className={`${inputCls} w-28`}
              type="number"
              step="0.001"
              min="0"
              placeholder="qty"
              value={line.quantity}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)),
                )
              }
            />
            <span className="w-8 text-xs text-neutral-400">{unitOf(line.ingredientId)}</span>
            <button
              onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => setLines((ls) => [...ls, { ingredientId: "", quantity: "" }])}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          + Add ingredient
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {save.isPending ? "Saving…" : "Save recipe"}
        </button>
        {save.isSuccess && <span className="text-xs text-green-600">Saved ✓</span>}
      </div>
    </div>
  );
}

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className}`}>{children}</th>;
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`px-4 py-2.5 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
