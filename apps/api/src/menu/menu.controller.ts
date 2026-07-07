import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { MenuService } from "./menu.service";
import { CreateMenuItemDto, SetRecipeDto, UpdateMenuItemDto } from "./dto";

@Controller("menu-items")
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  findAll() {
    return this.menu.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.menu.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMenuItemDto) {
    return this.menu.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menu.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.menu.remove(id);
  }

  @Put(":id/recipe")
  setRecipe(@Param("id") id: string, @Body() dto: SetRecipeDto) {
    return this.menu.setRecipe(id, dto);
  }
}
