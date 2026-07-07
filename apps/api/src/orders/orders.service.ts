import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DEFAULT_TAX_BPS,
  OrderStatus,
  sumCents,
  taxOf,
} from "@erp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { CreateOrderDto, PayOrderDto } from "./dto";

const orderInclude = {
  lines: { include: { modifiers: true } },
  payments: true,
  table: true,
} as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private get taxBps(): number {
    const fromEnv = Number(process.env.TAX_RATE_BPS);
    return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : DEFAULT_TAX_BPS;
  }

  findAll() {
    return this.prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(dto: CreateOrderDto) {
    // Load referenced menu items and modifiers so prices are snapshotted
    // server-side (never trust client-provided amounts).
    const menuItemIds = [...new Set(dto.lines.map((l) => l.menuItemId))];
    const modifierIds = [
      ...new Set(dto.lines.flatMap((l) => l.modifierIds ?? [])),
    ];

    const [menuItems, modifiers] = await Promise.all([
      this.prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } }),
      modifierIds.length
        ? this.prisma.modifier.findMany({ where: { id: { in: modifierIds } } })
        : Promise.resolve([]),
    ]);

    const menuById = new Map(menuItems.map((m) => [m.id, m]));
    const modById = new Map(modifiers.map((m) => [m.id, m]));

    const lineData = dto.lines.map((line) => {
      const item = menuById.get(line.menuItemId);
      if (!item) {
        throw new BadRequestException(`Menu item ${line.menuItemId} not found`);
      }
      const mods = (line.modifierIds ?? []).map((mid) => {
        const mod = modById.get(mid);
        if (!mod) throw new BadRequestException(`Modifier ${mid} not found`);
        return mod;
      });
      const modTotal = sumCents(mods.map((m) => m.priceDelta));
      const unitPrice = item.price + modTotal;
      const lineTotal = unitPrice * line.qty;
      return {
        menuItemId: item.id,
        nameSnapshot: item.name,
        qty: line.qty,
        unitPrice,
        lineTotal,
        modifiers: {
          create: mods.map((m) => ({
            modifierId: m.id,
            nameSnapshot: m.name,
            priceDelta: m.priceDelta,
          })),
        },
      };
    });

    const subtotal = sumCents(lineData.map((l) => l.lineTotal));
    const taxTotal = taxOf(subtotal, this.taxBps);
    const total = subtotal + taxTotal;

    return this.prisma.order.create({
      data: {
        channel: dto.channel,
        tableId: dto.tableId,
        status: OrderStatus.OPEN,
        subtotal,
        taxTotal,
        total,
        lines: { create: lineData },
      },
      include: orderInclude,
    });
  }

  /** Capture full payment and mark the order PAID. */
  async pay(id: string, dto: PayOrderDto) {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException("Order is already paid");
    }
    if (order.status === OrderStatus.VOID) {
      throw new BadRequestException("Order is void");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: { orderId: id, method: dto.method, amount: order.total },
      });
      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.PAID },
        include: orderInclude,
      });
      // Auto-post the double-entry journal in the same transaction.
      await this.ledger.postForOrder(tx, updated, dto.method);
      return updated;
    });
  }

  async void(id: string) {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException("Cannot void a paid order");
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.VOID },
      include: orderInclude,
    });
  }
}
