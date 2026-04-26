import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AppContext } from '../loaders';
import { ReviewType } from '../models/review.model';
import { UserType } from '../models/user.model';

@Resolver(() => ReviewType)
export class Ch05ReviewResolver {
  // DataLoader로 배칭 — 100개 리뷰의 author를 1번의 findByIds로 처리
  @ResolveField(() => UserType, { nullable: true, name: 'author' })
  async author(
    @Parent() review: ReviewType,
    @Context() ctx: AppContext,
  ): Promise<UserType | null> {
    return ctx.loaders.user.load(review.userId);
  }
}
