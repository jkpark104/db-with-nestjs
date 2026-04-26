import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ProductType } from './product.model';

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

  // product는 Field Resolver가 해결한다.
  @Field(() => ProductType, { nullable: true })
  product?: ProductType;
}
