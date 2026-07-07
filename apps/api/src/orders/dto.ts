import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { OrderChannel, PaymentMethod } from "@erp/shared";

export class OrderLineInputDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifierIds?: string[];
}

export class CreateOrderDto {
  @IsIn(Object.values(OrderChannel))
  channel!: string;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineInputDto)
  lines!: OrderLineInputDto[];
}

export class PayOrderDto {
  @IsIn(Object.values(PaymentMethod))
  method!: string;
}
