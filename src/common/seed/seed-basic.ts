// ============================================================
// seed-basic -- Ch01~02 학습용 소량 데이터
// ============================================================
// User 10, Product 30, Category 5, Order 20, OrderItem 60, Review 50
// 두 DB(PG + MySQL)에 동시에 시드합니다.
// ============================================================

import { DataSource } from 'typeorm';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/ko';
import { User } from '../../ch01-shop-open/typeorm/entities/user.entity';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { Category } from '../../ch02-catalog/typeorm/entities/category.entity';
import { ProductCategory } from '../../ch02-catalog/typeorm/entities/product-category.entity';
import { Order, OrderStatus } from '../../ch02-catalog/typeorm/entities/order.entity';
import { OrderItem } from '../../ch02-catalog/typeorm/entities/order-item.entity';
import { Review } from '../../ch02-catalog/typeorm/entities/review.entity';
import 'dotenv/config';

export async function seedBasic() {
  // -- TypeORM (PostgreSQL) 연결 --
  const pg = new DataSource({
    type: 'postgres',
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
    database: process.env.PG_DATABASE,
    username: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    entities: [User, Product, Category, ProductCategory, Order, OrderItem, Review],
    synchronize: true,
  });
  await pg.initialize();

  // -- Prisma (MySQL) 연결 --
  const prisma = new PrismaClient();

  console.log('Basic seed 시작...');

  // -- Users (10명) --
  const pgUsers: User[] = [];
  for (let i = 0; i < 10; i++) {
    const user = await pg.getRepository(User).save({
      email: faker.internet.email(),
      name: faker.person.fullName(),
    });
    pgUsers.push(user);

    await prisma.user.create({
      data: { email: user.email, name: user.name },
    });
  }

  // -- Categories (5개) --
  const categoryNames = ['전자기기', '의류', '식품', '도서', '스포츠'];
  const pgCategories: Category[] = [];
  for (const name of categoryNames) {
    const cat = await pg.getRepository(Category).save({ name });
    pgCategories.push(cat);
    await prisma.category.create({ data: { name } });
  }

  // -- Products (30개) --
  const pgProducts: Product[] = [];
  for (let i = 0; i < 30; i++) {
    const product = await pg.getRepository(Product).save({
      name: faker.commerce.productName(),
      price: Number(faker.commerce.price({ min: 1000, max: 100000 })),
      stock: faker.number.int({ min: 0, max: 500 }),
      description: faker.commerce.productDescription(),
    });
    pgProducts.push(product);

    await prisma.product.create({
      data: {
        name: product.name,
        price: product.price,
        stock: product.stock,
        description: product.description,
      },
    });
  }

  // -- ProductCategory 연결 --
  for (const product of pgProducts) {
    const cat = faker.helpers.arrayElement(pgCategories);
    await pg.getRepository(ProductCategory).save({
      productId: product.id,
      categoryId: cat.id,
    });
    await prisma.productCategory.create({
      data: { productId: product.id, categoryId: cat.id },
    });
  }

  // -- Orders (20건) + OrderItems (약 60건) --
  for (let i = 0; i < 20; i++) {
    const user = faker.helpers.arrayElement(pgUsers);
    const itemCount = faker.number.int({ min: 1, max: 5 });
    const items: { productId: number; quantity: number; unitPrice: number }[] = [];

    for (let j = 0; j < itemCount; j++) {
      const prod = faker.helpers.arrayElement(pgProducts);
      items.push({
        productId: prod.id,
        quantity: faker.number.int({ min: 1, max: 5 }),
        unitPrice: prod.price,
      });
    }

    const totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

    await pg.getRepository(Order).save({
      userId: user.id,
      totalAmount,
      status: OrderStatus.PAID,
      orderItems: items.map((it) => Object.assign(new OrderItem(), it)),
    });

    await prisma.order.create({
      data: {
        userId: user.id,
        totalAmount,
        status: 'PAID',
        orderItems: { create: items },
      },
    });
  }

  // -- Reviews (50개) --
  for (let i = 0; i < 50; i++) {
    const user = faker.helpers.arrayElement(pgUsers);
    const product = faker.helpers.arrayElement(pgProducts);
    const data = {
      userId: user.id,
      productId: product.id,
      rating: faker.number.int({ min: 1, max: 5 }),
      content: faker.lorem.sentence(),
    };

    await pg.getRepository(Review).save(data);
    await prisma.review.create({ data });
  }

  console.log('Basic seed 완료!');
  await pg.destroy();
  await prisma.$disconnect();
}
