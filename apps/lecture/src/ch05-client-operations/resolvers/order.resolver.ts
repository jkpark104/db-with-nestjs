import { Inject } from '@nestjs/common';
import {
  Args,
  Context,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import type { PubSub } from 'graphql-subscriptions';
import { getStore, OrderStatus } from '@app/mock-data';
import {
  orderItemRepo,
  orderRepo,
} from '../../ch01-rest-pain/repositories';
import { AppContext } from '../loaders';
import { OrderItemType } from '../models/order-item.model';
import { OrderStatusEnum, OrderType } from '../models/order.model';
import { ProductType } from '../models/product.model';
import { UserType } from '../models/user.model';
import { PUB_SUB } from '../pubsub.provider';

const ORDER_STATUS_CHANGED = 'orderStatusChanged';

@Resolver(() => OrderType)
export class Ch05OrderResolver {
  constructor(@Inject(PUB_SUB) private readonly pubsub: PubSub) {}

  @Query(() => OrderType, { nullable: true, name: 'order' })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    return ((await orderRepo.findOne(id)) ?? null) as unknown as OrderType | null;
  }

  @Query(() => [OrderType], { name: 'orders' })
  async orders(): Promise<OrderType[]> {
    return (await orderRepo.findMany()) as unknown as OrderType[];
  }

  // 시연용 mutation — 상태 변경 시 구독자에게 push
  @Mutation(() => OrderType)
  async updateOrderStatus(
    @Args('id', { type: () => Int }) id: number,
    @Args('status', { type: () => OrderStatusEnum }) status: OrderStatusEnum,
  ): Promise<OrderType> {
    const store = getStore();
    const order = store.orders.find((o) => o.id === id);
    if (!order) throw new Error(`Order ${id} not found`);
    order.status = status as OrderStatus;
    await this.pubsub.publish(ORDER_STATUS_CHANGED, { orderStatusChanged: order });
    return order as unknown as OrderType;
  }

  // 폴링 없이 실시간으로 상태 변경 받기
  @Subscription(() => OrderType, { name: ORDER_STATUS_CHANGED })
  orderStatusChanged() {
    return this.pubsub.asyncIterableIterator(ORDER_STATUS_CHANGED);
  }

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
export class Ch05OrderItemResolver {
  @ResolveField(() => ProductType, { nullable: true })
  async product(
    @Parent() item: OrderItemType,
    @Context() ctx: AppContext,
  ): Promise<ProductType | null> {
    return ctx.loaders.product.load(item.productId);
  }
}
