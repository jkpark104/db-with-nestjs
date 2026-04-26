import { Field, Int, ObjectType } from '@nestjs/graphql';
import { UserType } from './user.model';

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

  // 정규화: userName을 박지 않는다. author.name으로 클라이언트가 명시.
  @Field(() => UserType, { nullable: true })
  author?: UserType;
}
