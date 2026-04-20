// ============================================================
// seed-bulk -- Ch03~06 성능 체감용 대량 데이터
// ============================================================
// User 100 / Product 500 / Order 2,000 / OrderItem ~8,000
// 배치 INSERT로 빠르게 삽입합니다.
// ============================================================

import { DataSource } from 'typeorm';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { faker } from '@faker-js/faker/locale/ko';
import { User } from '../../ch01-shop-open/typeorm/entities/user.entity';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { Category } from '../../ch02-catalog/typeorm/entities/category.entity';
import { ProductCategory } from '../../ch02-catalog/typeorm/entities/product-category.entity';
import {
  Order,
  OrderStatus,
} from '../../ch02-catalog/typeorm/entities/order.entity';
import { OrderItem } from '../../ch02-catalog/typeorm/entities/order-item.entity';
import { Review } from '../../ch02-catalog/typeorm/entities/review.entity';
import 'dotenv/config';

export async function seedBulk() {
  const pg = new DataSource({
    type: 'postgres',
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
    database: process.env.PG_DATABASE,
    username: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    entities: [
      User,
      Product,
      Category,
      ProductCategory,
      Order,
      OrderItem,
      Review,
    ],
    synchronize: true,
  });
  await pg.initialize();
  const adapter = new PrismaMariaDb({
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'lecture',
    password: process.env.MYSQL_PASSWORD ?? 'lecture1234',
    database: process.env.MYSQL_DATABASE ?? 'db_lecture',
  });
  const prisma = new PrismaClient({ adapter });

  console.log('Bulk seed 시작 (시간이 걸립니다)...');

  // -- Users 100명 --
  const userIds: number[] = [];
  for (let i = 0; i < 100; i++) {
    const email = `bulk${i}@test.com`;
    const name = faker.person.fullName();
    const u = await pg.getRepository(User).save({ email, name });
    userIds.push(u.id);
    await prisma.user.create({ data: { email, name } });
  }
  console.log('  Users: 100');

  // -- Categories 20개 --
  const catIds: number[] = [];
  for (let i = 0; i < 20; i++) {
    const name = `카테고리${i + 1}`;
    const c = await pg.getRepository(Category).save({ name });
    catIds.push(c.id);
    await prisma.category.create({ data: { name } });
  }

  // -- Products 500개 (배치 100개씩) --
  const productIds: number[] = [];
  for (let batch = 0; batch < 5; batch++) {
    const pgBatch = [];
    const prismaBatch = [];
    for (let i = 0; i < 100; i++) {
      const data = {
        name: faker.commerce.productName(),
        price: Number(faker.commerce.price({ min: 1000, max: 100000 })),
        stock: faker.number.int({ min: 0, max: 1000 }),
        description: faker.commerce.productDescription(),
      };
      pgBatch.push(data);
      prismaBatch.push(data);
    }

    const saved = await pg.getRepository(Product).save(pgBatch);
    productIds.push(...saved.map((p) => p.id));

    for (const d of prismaBatch) {
      await prisma.product.create({ data: d });
    }

    console.log(`  Products: ${(batch + 1) * 100}`);
  }

  // -- Orders 2,000건 + OrderItems ~8,000건 (배치) --
  const statuses = Object.values(OrderStatus);
  for (let batch = 0; batch < 20; batch++) {
    for (let i = 0; i < 100; i++) {
      const userId = faker.helpers.arrayElement(userIds);
      const itemCount = faker.number.int({ min: 2, max: 6 });
      const items = Array.from({ length: itemCount }, () => {
        const prodId = faker.helpers.arrayElement(productIds);
        return {
          productId: prodId,
          quantity: faker.number.int({ min: 1, max: 5 }),
          unitPrice: Number(faker.commerce.price({ min: 1000, max: 50000 })),
        };
      });
      const totalAmount = items.reduce(
        (s, it) => s + it.quantity * it.unitPrice,
        0,
      );
      const status = faker.helpers.arrayElement(statuses);

      await pg.getRepository(Order).save({
        userId,
        totalAmount,
        status,
        orderItems: items.map((it) => Object.assign(new OrderItem(), it)),
      });

      await prisma.order.create({
        data: {
          userId,
          totalAmount,
          status,
          orderItems: { create: items },
        },
      });
    }
    if ((batch + 1) % 5 === 0) {
      console.log(`  Orders: ${(batch + 1) * 100}`);
    }
  }

  console.log('Bulk seed 완료!');
  await pg.destroy();
  await prisma.$disconnect();
}
