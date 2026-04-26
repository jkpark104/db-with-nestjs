import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { productRepo } from '../../ch01-rest-pain/repositories';
import { ProductType } from '../models/product.model';

@Resolver(() => ProductType)
export class Ch02ProductResolver {
  @Query(() => ProductType, { nullable: true, name: 'product' })
  async product(@Args('id', { type: () => Int }) id: number): Promise<ProductType | null> {
    return (await productRepo.findOne(id)) ?? null;
  }

  @Query(() => [ProductType], { name: 'products' })
  async products(): Promise<ProductType[]> {
    return productRepo.findMany();
  }
}
