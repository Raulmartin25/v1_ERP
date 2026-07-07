import { Injectable } from "@nestjs/common";
import { Prisma } from "@erp/db";
import { PaymentMethod } from "@erp/shared";
import { PrismaService } from "../prisma/prisma.service";

// Chart-of-accounts codes (see seed).
const ACC = {
  CASH: "1000",
  CARD: "1010",
  INVENTORY: "1200",
  TAX_PAYABLE: "2000",
  SALES: "4000",
  COGS: "5000",
} as const;

type Tx = Prisma.TransactionClient;

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Post a balanced journal entry for a paid order. Idempotent per order.
   * Runs inside the caller's transaction so payment + posting are atomic.
   *
   *   Dr Cash / Card Clearing   total
   *     Cr Sales Revenue              subtotal
   *     Cr Tax Payable               tax
   *   Dr Cost of Goods Sold     cogs
   *     Cr Inventory                 cogs
   */
  async postForOrder(
    tx: Tx,
    order: { id: string; number: number; subtotal: number; taxTotal: number; total: number },
    method: string,
  ) {
    const existing = await tx.journalEntry.findUnique({
      where: { orderId: order.id },
    });
    if (existing) return existing;

    const accounts = await tx.account.findMany();
    const byCode = new Map(accounts.map((a) => [a.code, a]));
    const acc = (code: string) => {
      const a = byCode.get(code);
      if (!a) throw new Error(`Account ${code} missing from chart of accounts`);
      return a.id;
    };

    const cashAccount = method === PaymentMethod.CASH ? ACC.CASH : ACC.CARD;
    const cogs = await this.computeCogs(tx, order.id);

    const lines: Prisma.JournalLineCreateManyEntryInput[] = [
      { accountId: acc(cashAccount), debit: order.total, credit: 0 },
      { accountId: acc(ACC.SALES), debit: 0, credit: order.subtotal },
      { accountId: acc(ACC.TAX_PAYABLE), debit: 0, credit: order.taxTotal },
    ];
    if (cogs > 0) {
      lines.push({ accountId: acc(ACC.COGS), debit: cogs, credit: 0 });
      lines.push({ accountId: acc(ACC.INVENTORY), debit: 0, credit: cogs });
    }

    return tx.journalEntry.create({
      data: {
        description: `Sale — order #${order.number}`,
        orderId: order.id,
        lines: { create: lines },
      },
    });
  }

  /** Cost of goods for an order, from current recipe costs. */
  private async computeCogs(tx: Tx, orderId: string): Promise<number> {
    const lines = await tx.orderLine.findMany({
      where: { orderId },
      include: {
        menuItem: {
          include: { recipe: { include: { lines: { include: { ingredient: true } } } } },
        },
      },
    });
    let cogs = 0;
    for (const ol of lines) {
      const recipe = ol.menuItem.recipe;
      const unitCost = recipe
        ? Math.round(
            recipe.lines.reduce(
              (s, l) => s + Number(l.quantity) * Number(l.ingredient.costPerUnit),
              0,
            ),
          )
        : 0;
      cogs += unitCost * ol.qty;
    }
    return cogs;
  }

  /** Post ledger entries for any PAID orders that don't yet have one. */
  async backfill() {
    const orders = await this.prisma.order.findMany({
      where: { status: "PAID", journalEntry: { is: null } },
      include: { payments: true },
    });
    let posted = 0;
    for (const order of orders) {
      const method = order.payments[0]?.method ?? PaymentMethod.CASH;
      await this.prisma.$transaction((tx) => this.postForOrder(tx, order, method));
      posted++;
    }
    return { posted, scanned: orders.length };
  }

  /** All accounts with their running balance (signed by normal side). */
  async accountsWithBalances() {
    const accounts = await this.prisma.account.findMany({ orderBy: { code: "asc" } });
    const sums = await this.prisma.journalLine.groupBy({
      by: ["accountId"],
      _sum: { debit: true, credit: true },
    });
    const byAccount = new Map(sums.map((s) => [s.accountId, s._sum]));

    let totalDebit = 0;
    let totalCredit = 0;
    const rows = accounts.map((a) => {
      const s = byAccount.get(a.id);
      const debit = s?.debit ?? 0;
      const credit = s?.credit ?? 0;
      totalDebit += debit;
      totalCredit += credit;
      // Assets & expenses are debit-normal; the rest are credit-normal.
      const debitNormal = a.type === "ASSET" || a.type === "EXPENSE";
      const balance = debitNormal ? debit - credit : credit - debit;
      return { code: a.code, name: a.name, type: a.type, debit, credit, balance };
    });

    return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
  }

  /** Recent journal entries with their lines and account names. */
  async listEntries(limit = 50) {
    const entries = await this.prisma.journalEntry.findMany({
      orderBy: { date: "desc" },
      take: limit,
      include: { lines: { include: { account: true } } },
    });
    return entries.map((e) => ({
      id: e.id,
      date: e.date,
      description: e.description,
      orderId: e.orderId,
      lines: e.lines.map((l) => ({
        account: `${l.account.code} ${l.account.name}`,
        debit: l.debit,
        credit: l.credit,
      })),
    }));
  }
}
