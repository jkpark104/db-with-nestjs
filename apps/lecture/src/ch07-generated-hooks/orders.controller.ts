import { Body, Controller, HttpCode, Post, BadRequestException } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type CreateOrderInput = components['schemas']['CreateOrderInput'];
type Order = components['schemas']['Order'];

@Controller('orders')
export class Ch07OrdersController {
  @Post()
  @HttpCode(201)
  create(@Body() body: CreateOrderInput): Order {
    const store = getStore();
    let total = 0;
    for (const item of body.items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (!product) throw new BadRequestException(`product ${item.productId} not found`);
      total += product.priceInWon * item.quantity;
    }
    const order: Order = {
      id: store.orders.length + 1,
      userId: body.userId,
      status: 'PENDING',
      totalAmountInWon: total,
      createdAt: new Date().toISOString(),
    };
    store.orders.push(order);
    return order;
  }
}
