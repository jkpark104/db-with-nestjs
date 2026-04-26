import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ProductType } from './product.model';

@ObjectType('OrderItem')
export class OrderItemType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;

  @Field(() => ProductType)
  product!: ProductType;
}
