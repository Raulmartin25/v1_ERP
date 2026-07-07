import { formatMoney } from "@erp/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Health = { status: string; db: string; timestamp: string };

async function getHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`${API_URL}/api/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

const MODULES = [
  { name: "POS / Orders", desc: "Take orders, modifiers, payments", status: "Live", href: "/pos" },
  { name: "Menu & Recipe", desc: "Items, recipes, food-cost %", status: "Live", href: "/menu" },
  { name: "Finance & Accounting", desc: "Double-entry ledger from sales", status: "Live", href: "/finance" },
];

export default async function Home() {
  const health = await getHealth();
  const apiUp = health?.status === "ok";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Restaurant ERP</h1>
      <p className="mt-2 text-neutral-500">Prototype · full-stack TypeScript</p>

      <section className="mt-8 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          System status
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Dot ok={apiUp} /> API {apiUp ? "connected" : "unreachable"}
          </li>
          <li className="flex items-center gap-2">
            <Dot ok={health?.db === "up"} /> Database{" "}
            {health?.db === "up" ? "connected" : "unreachable"}
          </li>
        </ul>
        <p className="mt-3 text-xs text-neutral-400">
          Money helper check · {formatMoney(950)} · {formatMoney(350)}
        </p>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {MODULES.map((m) => {
          const live = m.status === "Live";
          const card = (
            <div
              className={`h-full rounded-xl border p-4 ${
                live
                  ? "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="text-sm font-medium">{m.name}</div>
              <div className="mt-1 text-xs text-neutral-500">{m.desc}</div>
              <div
                className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] ${
                  live
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {m.status}
              </div>
            </div>
          );
          return m.href ? (
            <a key={m.name} href={m.href}>
              {card}
            </a>
          ) : (
            <div key={m.name}>{card}</div>
          );
        })}
      </section>
    </main>
  );
}

function Dot({ ok }: { ok?: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`}
    />
  );
}
