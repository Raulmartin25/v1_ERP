import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateModifierGroupDto } from "./dto";

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}

  findAllGroups() {
    return this.prisma.modifierGroup.findMany({
      include: { modifiers: true },
      orderBy: { name: "asc" },
    });
  }

  createGroup(dto: CreateModifierGroupDto) {
    return this.prisma.modifierGroup.create({
      data: {
        name: dto.name,
        modifiers: {
          create: dto.modifiers.map((m) => ({
            name: m.name,
            priceDelta: m.priceDelta ?? 0,
          })),
        },
      },
      include: { modifiers: true },
    });
  }

  async removeGroup(id: string) {
    const group = await this.prisma.modifierGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException(`Modifier group ${id} not found`);
    return this.prisma.modifierGroup.delete({ where: { id } });
  }

  async attach(groupId: string, menuItemId: string) {
    return this.prisma.menuItemModifier.upsert({
      where: { menuItemId_groupId: { menuItemId, groupId } },
      create: { menuItemId, groupId },
      update: {},
    });
  }

  async detach(groupId: string, menuItemId: string) {
    return this.prisma.menuItemModifier.deleteMany({
      where: { menuItemId, groupId },
    });
  }
}
