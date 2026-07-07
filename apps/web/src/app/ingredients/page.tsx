"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IngredientsApi } from "@/lib/api";

const UNITS = ["g", "ml", "unit"];

export default function IngredientsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ingredients"],
    queryFn: IngredientsApi.list,
  });

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: IngredientsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      setName("");
      setCost("");
      setStock("");
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const remove = useMutation({
    mutationFn: IngredientsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
    onError: (e: Error) => setFormError(e.message),
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Ingredients</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Unit costs are stored in cents (sub-cent precision supported).
      </p>

      <form
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            name: name.trim(),
            unit,
            costPerUnit: Number(cost),
            stockQty: stock ? Number(stock) : undefined,
          });
        }}
      >
        <Field label="Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Unit">
          <select className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Cost / unit (¢)">
          <input
            className={inputCls}
            type="number"
            step="0.0001"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
          />
        </Field>
        <Field label="Stock">
          <input
            className={inputCls}
            type="number"
            step="0.001"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </Field>
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {create.isPending ? "Adding…" : "Add"}
        </button>
      </form>

      {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
            <tr>
              <Th>Name</Th>
              <Th>Unit</Th>
              <Th className="text-right">Cost / unit (¢)</Th>
              <Th className="text-right">Stock</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td colSpan={5}>Loading…</Td>
              </tr>
            )}
            {error && (
              <tr>
                <Td colSpan={5}>Failed to load. Is the API running?</Td>
              </tr>
            )}
            {data?.map((i) => (
              <tr key={i.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <Td className="font-medium">{i.name}</Td>
                <Td>{i.unit}</Td>
                <Td className="text-right tabular-nums">{Number(i.costPerUnit)}</Td>
                <Td className="text-right tabular-nums">{Number(i.stockQty)}</Td>
                <Td className="text-right">
                  <button
                    onClick={() => remove.mutate(i.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </Td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <Td colSpan={5} className="text-neutral-400">
                  No ingredients yet.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
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
