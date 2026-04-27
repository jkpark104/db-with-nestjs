import { faker } from '@faker-js/faker';
import {
  Category,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductCategory,
  Review,
  Store,
  User,
} from './domain';

const STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export function createSeed(size: 'basic' | 'medium' = 'basic'): Store {
  faker.seed(42);

  const counts =
    size === 'basic'
      ? { users: 10, products: 30, orders: 20, reviewsTarget: 50 }
      : { users: 50, products: 200, orders: 200, reviewsTarget: 500 };

  const users: User[] = Array.from({ length: counts.users }, (_, i) => ({
    id: i + 1,
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    createdAt: faker.date.past().toISOString(),
  }));

  const categories: Category[] = ['전자기기', '의류', '식품', '도서', '스포츠'].map((name, i) => ({
    id: i + 1,
    name,
  }));

  const products: Product[] = Array.from({ length: counts.products }, (_, i) => ({
    id: i + 1,
    name: faker.commerce.productName(),
    priceInWon: Number(faker.commerce.price({ min: 1000, max: 500000, dec: 0 })),
    stock: faker.number.int({ min: 0, max: 100 }),
    description: faker.commerce.productDescription(),
    createdAt: faker.date.past().toISOString(),
  }));

  const productCategories: ProductCategory[] = products.flatMap((p) => {
    const count = faker.number.int({ min: 1, max: 2 });
    const catIds = faker.helpers.arrayElements(
      categories.map((c) => c.id),
      count,
    );
    return catIds.map((categoryId) => ({ productId: p.id, categoryId }));
  });

  const orders: Order[] = Array.from({ length: counts.orders }, (_, i) => ({
    id: i + 1,
    userId: faker.helpers.arrayElement(users).id,
    status: faker.helpers.arrayElement(STATUSES),
    totalAmountInWon: 0,
    createdAt: faker.date.past().toISOString(),
  }));

  const orderItems: OrderItem[] = orders.flatMap((o) => {
    const itemCount = faker.number.int({ min: 1, max: 4 });
    return Array.from({ length: itemCount }, (_, i) => {
      const product = faker.helpers.arrayElement(products);
      const quantity = faker.number.int({ min: 1, max: 5 });
      return {
        id: o.id * 100 + i + 1,
        orderId: o.id,
        productId: product.id,
        quantity,
        unitPriceInWon: product.priceInWon,
      };
    });
  });

  for (const order of orders) {
    const items = orderItems.filter((it) => it.orderId === order.id);
    order.totalAmountInWon = items.reduce((sum, it) => sum + it.unitPriceInWon * it.quantity, 0);
  }

  const reviews: Review[] = Array.from({ length: counts.reviewsTarget }, (_, i) => ({
    id: i + 1,
    userId: faker.helpers.arrayElement(users).id,
    productId: faker.helpers.arrayElement(products).id,
    rating: faker.number.int({ min: 1, max: 5 }),
    content: faker.lorem.sentence(),
    createdAt: faker.date.past().toISOString(),
  }));

  return { users, products, categories, productCategories, orders, orderItems, reviews };
}
