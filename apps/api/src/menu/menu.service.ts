import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMenuItemDto, SetRecipeDto, UpdateMenuItemDto } from "./dto";

// Shape of a menu item loaded with its recipe + ingredient costs.
const menuInclude = {
  recipe: { include: { lines: { include: { ingredient: true } } } },
  modifierLinks: { include: { group: { include: { modifiers: true } } } },
} as const;

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.menuItem.findMany({
      include: menuInclude,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return items.map((i) => this.withCost(i));
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: menuInclude,
    });
    if (!item) throw new NotFoundException(`Menu item ${id} not found`);
    return this.withCost(item);
  }

  async create(dto: CreateMenuItemDto) {
    const item = await this.prisma.menuItem.create({
      data: dto,
      include: menuInclude,
    });
    return this.withCost(item);
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    await this.ensureExists(id);
    const item = await this.prisma.menuItem.update({
      where: { id },
      data: dto,
      include: menuInclude,
    });
    return this.withCost(item);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.menuItem.delete({ where: { id } });
  }

  /** Create or replace the recipe (and its lines) for a menu item. */
  async setRecipe(menuItemId: string, dto: SetRecipeDto) {
    await this.ensureExists(menuItemId);

    await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.upsert({
        where: { menuItemId },
        create: {
          menuItemId,
          name: dto.name ?? "Recipe",
          yieldQty: dto.yieldQty ?? 1,
        },
        update: {
          name: dto.name ?? "Recipe",
          yieldQty: dto.yieldQty ?? 1,
        },
      });

      // Replace all lines
      await tx.recipeLine.deleteMany({ where: { recipeId: recipe.id } });
      if (dto.lines.length > 0) {
        await tx.recipeLine.createMany({
          data: dto.lines.map((l) => ({
            recipeId: recipe.id,
            ingredientId: l.ingredientId,
            quantity: l.quantity,
          })),
        });
      }
    });

    return this.findOne(menuItemId);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.menuItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Menu item ${id} not found`);
  }

  /**
   * Attach the computed recipe cost (in cents) and food-cost percentage.
   * Cost = Σ(line.quantity × ingredient.costPerUnit).
   */
  private withCost<
    T extends {
      price: number;
      recipe: { lines: { quantity: unknown; ingredient: { costPerUnit: unknown } }[] } | null;
    },
  >(item: T) {
    const lines = item.recipe?.lines ?? [];
    const costCents = Math.round(
      lines.reduce(
        (sum, l) => sum + Number(l.quantity) * Number(l.ingredient.costPerUnit),
        0,
      ),
    );
    const foodCostPct =
      item.price > 0 ? Math.round((costCents / item.price) * 1000) / 10 : null;
    return { ...item, costCents, foodCostPct };
  }
}
