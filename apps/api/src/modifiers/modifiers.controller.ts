import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ModifiersService } from "./modifiers.service";
import { CreateModifierGroupDto } from "./dto";

@Controller("modifier-groups")
export class ModifiersController {
  constructor(private readonly modifiers: ModifiersService) {}

  @Get()
  findAll() {
    return this.modifiers.findAllGroups();
  }

  @Post()
  create(@Body() dto: CreateModifierGroupDto) {
    return this.modifiers.createGroup(dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.modifiers.removeGroup(id);
  }

  @Post(":groupId/menu-items/:menuItemId")
  attach(
    @Param("groupId") groupId: string,
    @Param("menuItemId") menuItemId: string,
  ) {
    return this.modifiers.attach(groupId, menuItemId);
  }

  @Delete(":groupId/menu-items/:menuItemId")
  detach(
    @Param("groupId") groupId: string,
    @Param("menuItemId") menuItemId: string,
  ) {
    return this.modifiers.detach(groupId, menuItemId);
  }
}
