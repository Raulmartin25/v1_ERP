import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { IngredientsService } from "./ingredients.service";
import { CreateIngredientDto, UpdateIngredientDto } from "./dto";

@Controller("ingredients")
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get()
  findAll() {
    return this.ingredients.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.ingredients.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateIngredientDto) {
    return this.ingredients.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateIngredientDto) {
    return this.ingredients.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.ingredients.remove(id);
  }
}
