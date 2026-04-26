import { Field, Float, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderItemType } from './order-item.model';
import { UserType } from './user.model';

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

  // 정규화의 핵심 — userName을 갖지 않는다. user 참조만 보유.
  @Field(() => Int)
  userId!: number;

  @Field(() => OrderStatusEnum)
  status!: OrderStatusEnum;

  @Field(() => Float)
  totalAmount!: number;

  @Field()
  createdAt!: Date;

  @Field(() => UserType, { nullable: true })
  user?: UserType;

  @Field(() => [OrderItemType])
  items?: OrderItemType[];
}
