import { Args, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { getStore } from '@app/mock-data';
import { productRepo, reviewRepo } from '../../ch01-rest-pain/repositories';
import { CategoryType } from '../models/category.model';
import { ProductType } from '../models/product.model';
import { ReviewType } from '../models/review.model';

@Resolver(() => ProductType)
export class Ch03ProductResolver {
  @Query(() => ProductType, { nullable: true, name: 'product' })
  async product(@Args('id', { type: () => Int }) id: number): Promise<ProductType | null> {
    return (await productRepo.findOne(id)) ?? null;
  }

  @Query(() => [ProductType], { name: 'products' })
  async products(): Promise<ProductType[]> {
    return productRepo.findMany();
  }

  @ResolveField(() => [ReviewType])
  async reviews(@Parent() product: ProductType): Promise<ReviewType[]> {
    return reviewRepo.findMany((r) => r.productId === product.id);
  }

  @ResolveField(() => [CategoryType])
  async categories(@Parent() product: ProductType): Promise<CategoryType[]> {
    const store = getStore();
    const ids = store.productCategories
      .filter((pc) => pc.productId === product.id)
      .map((pc) => pc.categoryId);
    return store.categories.filter((c) => ids.includes(c.id));
  }
}
