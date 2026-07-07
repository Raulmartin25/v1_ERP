import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto, PayOrderDto } from "./dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll() {
    return this.orders.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.orders.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Post(":id/pay")
  pay(@Param("id") id: string, @Body() dto: PayOrderDto) {
    return this.orders.pay(id, dto);
  }

  @Post(":id/void")
  void(@Param("id") id: string) {
    return this.orders.void(id);
  }
}
