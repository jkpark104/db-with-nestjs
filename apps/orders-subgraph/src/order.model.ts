import { Field, Float, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderItemType } from './order-item.model';
import { UserRefType } from './user-ref.model';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(OrderStatusEnum, { name: 'OrderStatus' });

@ObjectType('Order')
export class OrderType {
  @Field(() => Int)
  id!: number;

  @Field(() => OrderStatusEnum)
  status!: OrderStatusEnum;

  @Field(() => Float)
  totalAmount!: number;

  @Field()
  createdAt!: Date;

  // userId는 내부 보유. user는 ResolveField에서 stub 반환 → gateway가 users-subgraph로 분배.
  @Field(() => Int)
  userId!: number;

  @Field(() => UserRefType)
  user!: UserRefType;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];
}
