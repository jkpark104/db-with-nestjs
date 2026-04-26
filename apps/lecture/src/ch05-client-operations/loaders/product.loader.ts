import DataLoader from 'dataloader';
import { Product } from '@app/mock-data';
import { productRepo } from '../../ch01-rest-pain/repositories';

export function createProductLoader(): DataLoader<number, Product | null> {
  return new DataLoader<number, Product | null>(async (ids) => {
    const products = await productRepo.findByIds(ids);
    return products.map((p) => p ?? null);
  });
}
