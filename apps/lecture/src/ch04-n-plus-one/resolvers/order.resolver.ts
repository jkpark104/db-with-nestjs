import {
  Args,
  Context,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  orderItemRepo,
  orderRepo,
} from '../../ch01-rest-pain/repositories';
import { AppContext } from '../loaders';
import { OrderItemType } from '../models/order-item.model';
import { OrderType } from '../models/order.model';
import { ProductType } from '../models/product.model';
import { UserType } from '../models/user.model';

@Resolver(() => OrderType)
export class Ch04OrderResolver {
  @Query(() => OrderType, { nullable: true, name: 'order' })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    return ((await orderRepo.findOne(id)) ?? null) as unknown as OrderType | null;
  }

  @Query(() => [OrderType], { name: 'orders' })
  async orders(): Promise<OrderType[]> {
    return (await orderRepo.findMany()) as unknown as OrderType[];
  }

  // 100개 주문도 user 호출 1번 — DataLoader 배칭 효과
  @ResolveField(() => UserType, { nullable: true })
  async user(
    @Parent() order: OrderType,
    @Context() ctx: AppContext,
  ): Promise<UserType | null> {
    return ctx.loaders.user.load(order.userId);
  }

  @ResolveField(() => [OrderItemType])
  async items(@Parent() order: OrderType): Promise<OrderItemType[]> {
    return orderItemRepo.findMany((it) => it.orderId === order.id);
  }
}

@Resolver(() => OrderItemType)
export class Ch04OrderItemResolver {
  // 모든 OrderItem의 product를 1번에 배치
  @ResolveField(() => ProductType, { nullable: true })
  async product(
    @Parent() item: OrderItemType,
    @Context() ctx: AppContext,
  ): Promise<ProductType | null> {
    return ctx.loaders.product.load(item.productId);
  }
}
