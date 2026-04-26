import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Category')
export class CategoryType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;
}
