/** Shared domain enums used across API and web. Mirrors the Prisma schema. */

export const OrderChannel = {
  DINE_IN: "DINE_IN",
  TAKEAWAY: "TAKEAWAY",
  DELIVERY: "DELIVERY",
} as const;
export type OrderChannel = (typeof OrderChannel)[keyof typeof OrderChannel];

export const OrderStatus = {
  OPEN: "OPEN",
  SENT: "SENT",
  PAID: "PAID",
  CLOSED: "CLOSED",
  VOID: "VOID",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const AccountType = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];
