import { Args, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
  orderItemRepo,
  orderRepo,
  productRepo,
  userRepo,
} from '../../ch01-rest-pain/repositories';
import { OrderItemType } from '../models/order-item.model';
import { OrderType } from '../models/order.model';
import { ProductType } from '../models/product.model';
import { ReviewType } from '../models/review.model';
import { UserType } from '../models/user.model';

@Resolver(() => OrderType)
export class Ch03OrderResolver {
  @Query(() => OrderType, { nullable: true, name: 'order' })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    return ((await orderRepo.findOne(id)) ?? null) as unknown as OrderType | null;
  }

  @Query(() => [OrderType], { name: 'orders' })
  async orders(): Promise<OrderType[]> {
    return (await orderRepo.findMany()) as unknown as OrderType[];
  }

  // Order 자체는 userId만 갖는다. user는 별도 호출.
  @ResolveField(() => UserType, { nullable: true })
  async user(@Parent() order: OrderType): Promise<UserType | null> {
    return (await userRepo.findOne(order.userId)) ?? null;
  }

  @ResolveField(() => [OrderItemType])
  async items(@Parent() order: OrderType): Promise<OrderItemType[]> {
    return orderItemRepo.findMany((it) => it.orderId === order.id);
  }
}

@Resolver(() => OrderItemType)
export class Ch03OrderItemResolver {
  @ResolveField(() => ProductType, { nullable: true })
  async product(@Parent() item: OrderItemType): Promise<ProductType | null> {
    return (await productRepo.findOne(item.productId)) ?? null;
  }
}

@Resolver(() => ReviewType)
export class Ch03ReviewResolver {
  @ResolveField(() => UserType, { nullable: true, name: 'author' })
  async author(@Parent() review: ReviewType): Promise<UserType | null> {
    return (await userRepo.findOne(review.userId)) ?? null;
  }
}
