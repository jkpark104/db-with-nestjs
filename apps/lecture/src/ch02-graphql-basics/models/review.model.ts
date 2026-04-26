import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Review')
export class ReviewType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  userId!: number;

  @Field(() => Int)
  productId!: number;

  @Field(() => Int)
  rating!: number;

  @Field()
  content!: string;

  @Field()
  createdAt!: Date;
}
