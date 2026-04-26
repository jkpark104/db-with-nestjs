import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Product')
export class ProductType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Float)
  price!: number;
}
