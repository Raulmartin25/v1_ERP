import { Injectable } from "@nestjs/common";
import { Prisma } from "@erp/db";
import { PrismaService } from "../prisma/prisma.service";

type Sums = { debit: number; credit: number };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateFilter(from?: string, to?: string): Prisma.JournalLineWhereInput {
    if (!from && !to) return {};
    const date: Prisma.DateTimeFilter = {};
    if (from) date.gte = new Date(from);
    if (to) date.lte = new Date(to);
    return { entry: { date } };
  }

  /** Aggregate debit/credit per account code for entries in range. */
  private async aggregate(from?: string, to?: string): Promise<Map<string, Sums>> {
    const lines = await this.prisma.journalLine.findMany({
      where: this.dateFilter(from, to),
      include: { account: { select: { code: true } } },
    });
    const map = new Map<string, Sums>();
    for (const l of lines) {
      const m = map.get(l.account.code) ?? { debit: 0, credit: 0 };
      m.debit += l.debit;
      m.credit += l.credit;
      map.set(l.account.code, m);
    }
    return map;
  }

  /** Z-report: sales, tax, and cash collected by method — all from the ledger. */
  async salesSummary(from?: string, to?: string) {
    const agg = await this.aggregate(from, to);
    const credit = (code: string) => agg.get(code)?.credit ?? 0;
    const debit = (code: string) => agg.get(code)?.debit ?? 0;

    const orderCount = await this.prisma.journalEntry.count({
      where: {
        orderId: { not: null },
        ...(from || to
          ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
    });

    const grossSales = credit("4000");
    const tax = credit("2000");
    return {
      orderCount,
      grossSales,
      tax,
      totalCollected: debit("1000") + debit("1010"),
      byMethod: { cash: debit("1000"), card: debit("1010") },
      netSales: grossSales, // no discounts in v1
    };
  }

  /** Profit & loss from the ledger. */
  async pnl(from?: string, to?: string) {
    const agg = await this.aggregate(from, to);
    const revenue = agg.get("4000")?.credit ?? 0;
    const cogs = agg.get("5000")?.debit ?? 0;
    const grossProfit = revenue - cogs;
    const marginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : null;
    return { revenue, cogs, grossProfit, marginPct };
  }
}
