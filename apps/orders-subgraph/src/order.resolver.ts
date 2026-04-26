import { Args, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
  getStore,
  MockRepository,
  Order,
  OrderItem,
  Product,
} from '@app/mock-data';
import { OrderItemType } from './order-item.model';
import { OrderType } from './order.model';
import { ProductType } from './product.model';
import { UserRefType } from './user-ref.model';

const orderRepo = new MockRepository<Order>('Order', () => getStore().orders);
const orderItemRepo = new MockRepository<OrderItem>('OrderItem', () => getStore().orderItems);
const productRepo = new MockRepository<Product>('Product', () => getStore().products);

@Resolver(() => OrderType)
export class OrderResolver {
  @Query(() => OrderType, { nullable: true })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    return (await orderRepo.findOne(id)) as OrderType | null;
  }

  @Query(() => [OrderType])
  async orders(): Promise<OrderType[]> {
    return (await orderRepo.findMany()) as OrderType[];
  }

  // user 필드는 단지 키(id)만 반환 — gateway가 users-subgraph에 위임
  @ResolveField(() => UserRefType)
  user(@Parent() order: OrderType): UserRefType {
    return { id: order.userId } as UserRefType;
  }

  @ResolveField(() => [OrderItemType])
  async items(@Parent() order: OrderType): Promise<OrderItemType[]> {
    const items = await orderItemRepo.findMany((it) => it.orderId === order.id);
    return items as unknown as OrderItemType[];
  }
}

@Resolver(() => OrderItemType)
export class OrderItemResolver {
  @ResolveField(() => ProductType)
  async product(@Parent() item: OrderItemType & { productId: number }): Promise<ProductType> {
    const p = await productRepo.findOne(item.productId);
    if (!p) throw new Error(`Product ${item.productId} not found`);
    return p;
  }
}
