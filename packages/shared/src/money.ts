/**
 * Money is represented as an integer number of minor units (e.g. cents).
 * This avoids floating-point rounding errors in financial calculations.
 * All amounts flowing through orders and the ledger use this convention.
 */

/** A monetary amount in minor units (cents). */
export type Cents = number;

/** Default currency for the prototype. */
export const DEFAULT_CURRENCY = "USD";

/**
 * Default sales-tax rate in basis points (800 = 8.00%).
 * Single source of truth so the POS cart preview and the server agree.
 * The API may override via the TAX_RATE_BPS env var.
 */
export const DEFAULT_TAX_BPS = 800;

/** Convert a decimal major-unit amount (e.g. 12.34) to cents (1234). */
export function toCents(amount: number): Cents {
  return Math.round(amount * 100);
}

/** Convert cents (1234) back to major units (12.34). */
export function fromCents(cents: Cents): number {
  return cents / 100;
}

/** Format cents as a currency string, e.g. 1234 -> "$12.34". */
export function formatMoney(cents: Cents, currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(fromCents(cents));
}

/**
 * Apply a tax rate (in basis points, e.g. 800 = 8.00%) to a cents amount.
 * Returns the tax portion, rounded to the nearest cent.
 */
export function taxOf(cents: Cents, rateBps: number): Cents {
  return Math.round((cents * rateBps) / 10000);
}

/** Sum a list of cents amounts. */
export function sumCents(values: Cents[]): Cents {
  return values.reduce((acc, v) => acc + v, 0);
}
