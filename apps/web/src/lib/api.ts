const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message)
        ? body.message.join(", ")
        : (body.message ?? message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Types (mirror the API responses) ----
export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: string | number; // decimal cents
  stockQty: string | number;
};

export type RecipeLine = {
  id: string;
  ingredientId: string;
  quantity: string | number;
  ingredient: Ingredient;
};

export type Modifier = { id: string; name: string; priceDelta: number };
export type ModifierGroup = { id: string; name: string; modifiers: Modifier[] };

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number; // cents
  isActive: boolean;
  costCents: number;
  foodCostPct: number | null;
  recipe: { id: string; name: string; lines: RecipeLine[] } | null;
  modifierLinks: { group: ModifierGroup }[];
};

export type RestaurantTable = {
  id: string;
  number: number;
  area: string | null;
  seats: number;
};

export type OrderLine = {
  id: string;
  nameSnapshot: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  modifiers: { id: string; nameSnapshot: string; priceDelta: number }[];
};

export type Payment = { id: string; method: string; amount: number; createdAt: string };

export type Order = {
  id: string;
  number: number;
  channel: string;
  status: string;
  tableId: string | null;
  table: RestaurantTable | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  lines: OrderLine[];
  payments: Payment[];
  createdAt: string;
};

export type OrderLineInput = {
  menuItemId: string;
  qty: number;
  modifierIds?: string[];
};

// ---- Ingredients ----
export const IngredientsApi = {
  list: () => request<Ingredient[]>("/ingredients"),
  create: (data: { name: string; unit: string; costPerUnit: number; stockQty?: number }) =>
    request<Ingredient>("/ingredients", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/ingredients/${id}`, { method: "DELETE" }),
};

// ---- Menu items ----
export const MenuApi = {
  list: () => request<MenuItem[]>("/menu-items"),
  create: (data: { name: string; category: string; price: number }) =>
    request<MenuItem>("/menu-items", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/menu-items/${id}`, { method: "DELETE" }),
  setRecipe: (
    id: string,
    data: { name?: string; lines: { ingredientId: string; quantity: number }[] },
  ) =>
    request<MenuItem>(`/menu-items/${id}/recipe`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ---- Tables ----
export const TablesApi = {
  list: () => request<RestaurantTable[]>("/tables"),
};

// ---- Finance ----
export type SalesSummary = {
  orderCount: number;
  grossSales: number;
  tax: number;
  totalCollected: number;
  byMethod: { cash: number; card: number };
  netSales: number;
};

export type Pnl = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number | null;
};

export type AccountBalance = {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
};

export type TrialBalance = {
  rows: AccountBalance[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
};

export type JournalEntry = {
  id: string;
  date: string;
  description: string;
  orderId: string | null;
  lines: { account: string; debit: number; credit: number }[];
};

function range(period: "today" | "all"): string {
  if (period === "all") return "";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return `?from=${start.toISOString()}&to=${end.toISOString()}`;
}

export const FinanceApi = {
  sales: (period: "today" | "all") => request<SalesSummary>(`/reports/sales${range(period)}`),
  pnl: (period: "today" | "all") => request<Pnl>(`/reports/pnl${range(period)}`),
  accounts: () => request<TrialBalance>("/accounts"),
  ledger: () => request<JournalEntry[]>("/ledger"),
};

// ---- Orders ----
export const OrdersApi = {
  list: () => request<Order[]>("/orders"),
  get: (id: string) => request<Order>(`/orders/${id}`),
  create: (data: { channel: string; tableId?: string; lines: OrderLineInput[] }) =>
    request<Order>("/orders", { method: "POST", body: JSON.stringify(data) }),
  pay: (id: string, method: string) =>
    request<Order>(`/orders/${id}/pay`, {
      method: "POST",
      body: JSON.stringify({ method }),
    }),
  void: (id: string) => request<Order>(`/orders/${id}/void`, { method: "POST" }),
};
