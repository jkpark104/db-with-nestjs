import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('User')
export class UserType {
  @Field(() => Int)
  id!: number;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field()
  createdAt!: Date;
}
