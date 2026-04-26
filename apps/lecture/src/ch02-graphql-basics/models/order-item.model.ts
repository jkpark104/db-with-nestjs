import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('OrderItem')
export class OrderItemType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  productId!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;
}
