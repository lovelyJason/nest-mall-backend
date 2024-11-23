import { Controller, Get } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order } from './order.interface';

interface OrderResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
}

@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
  ) {}
  @Get('orders')
  async findAll(): Promise<OrderResponse<Order[]>> {
    return {
      code: 0,
      message: 'success',
      data: await this.orderService.findAll()
    }
  }
}
