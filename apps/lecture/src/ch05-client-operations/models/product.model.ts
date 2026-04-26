import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { CategoryType } from './category.model';
import { ReviewType } from './review.model';

@ObjectType('Product')
export class ProductType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  stock!: number;

  @Field()
  description!: string;

  @Field()
  createdAt!: Date;

  @Field(() => [CategoryType])
  categories?: CategoryType[];

  @Field(() => [ReviewType])
  reviews?: ReviewType[];
}
