import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';

// orders-subgraph는 User를 "확장"만 한다 — 소유권 없음.
// 같은 키(id)를 외부 참조로 선언 — 실제 데이터는 users-subgraph에서 해결.
@ObjectType('User')
@Directive('@extends')
@Directive('@key(fields: "id")')
export class UserRefType {
  @Field(() => Int)
  @Directive('@external')
  id!: number;
}
