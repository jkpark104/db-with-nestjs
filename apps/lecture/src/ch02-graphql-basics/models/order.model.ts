import { Field, Float, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderItemType } from './order-item.model';

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

  @Field(() => Int)
  userId!: number;

  @Field(() => OrderStatusEnum)
  status!: OrderStatusEnum;

  @Field(() => Float)
  totalAmount!: number;

  @Field()
  createdAt!: Date;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];
}
