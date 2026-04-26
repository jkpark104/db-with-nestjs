import {
  getStore,
  MockRepository,
  Order,
  OrderItem,
  Product,
  Review,
  User,
} from '@app/mock-data';

export const userRepo = new MockRepository<User>('User', () => getStore().users);
export const productRepo = new MockRepository<Product>('Product', () => getStore().products);
export const orderRepo = new MockRepository<Order>('Order', () => getStore().orders);
export const orderItemRepo = new MockRepository<OrderItem>(
  'OrderItem',
  () => getStore().orderItems,
);
export const reviewRepo = new MockRepository<Review>('Review', () => getStore().reviews);
