import { IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateIngredientDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  unit!: string; // g, ml, unit

  @IsNumber()
  @Min(0)
  costPerUnit!: number; // cents per unit (sub-cent precision allowed)

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty?: number;
}

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty?: number;
}
