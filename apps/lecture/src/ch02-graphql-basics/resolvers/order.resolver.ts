import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { orderItemRepo, orderRepo } from '../../ch01-rest-pain/repositories';
import { OrderType } from '../models/order.model';

@Resolver(() => OrderType)
export class Ch02OrderResolver {
  @Query(() => OrderType, { nullable: true, name: 'order' })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    const order = await orderRepo.findOne(id);
    if (!order) return null;
    const items = await orderItemRepo.findMany((it) => it.orderId === id);
    return { ...order, items } as unknown as OrderType;
  }

  @Query(() => [OrderType], { name: 'orders' })
  async orders(): Promise<OrderType[]> {
    const orders = await orderRepo.findMany();
    const result: OrderType[] = [];
    for (const o of orders) {
      const items = await orderItemRepo.findMany((it) => it.orderId === o.id);
      result.push({ ...o, items } as unknown as OrderType);
    }
    return result;
  }
}
