import type { components } from '@contracts/generated';

export type User        = components['schemas']['User'];
export type Product     = components['schemas']['Product'];
export type Order       = components['schemas']['Order'];
export type OrderStatus = components['schemas']['OrderStatus'];
export type OrderItem   = components['schemas']['OrderItem'];

export type { Category, ProductCategory, Review } from './domain.handwritten';

export interface Store {
  users: User[];
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  reviews: import('./domain.handwritten').Review[];
  categories: import('./domain.handwritten').Category[];
  productCategories: import('./domain.handwritten').ProductCategory[];
}
