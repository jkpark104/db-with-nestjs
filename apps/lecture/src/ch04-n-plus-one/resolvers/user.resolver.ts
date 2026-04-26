import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { userRepo } from '../../ch01-rest-pain/repositories';
import { UserType } from '../models/user.model';

@Resolver(() => UserType)
export class Ch04UserResolver {
  @Query(() => UserType, { nullable: true, name: 'user' })
  async user(@Args('id', { type: () => Int }) id: number): Promise<UserType | null> {
    return (await userRepo.findOne(id)) ?? null;
  }
}
