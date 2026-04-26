import { Args, Int, Query, ResolveReference, Resolver } from '@nestjs/graphql';
import { getStore, MockRepository, User } from '@app/mock-data';
import { UserType } from './user.model';

const userRepo = new MockRepository<User>('User', () => getStore().users);

@Resolver(() => UserType)
export class UserResolver {
  @Query(() => UserType, { nullable: true })
  async user(@Args('id', { type: () => Int }) id: number): Promise<UserType | null> {
    return (await userRepo.findOne(id)) ?? null;
  }

  @Query(() => [UserType])
  async users(): Promise<UserType[]> {
    return userRepo.findMany();
  }

  // gateway가 다른 subgraph에서 받은 User 참조를 해결할 때 호출.
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: number }): Promise<UserType | null> {
    return (await userRepo.findOne(reference.id)) ?? null;
  }
}
