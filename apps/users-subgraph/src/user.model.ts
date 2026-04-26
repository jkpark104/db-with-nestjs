import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';

// users-subgraph가 User 엔티티를 소유한다.
// @key(fields: "id")로 federation key 선언 — 다른 subgraph가 id로 참조 가능.
@ObjectType('User')
@Directive('@key(fields: "id")')
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
