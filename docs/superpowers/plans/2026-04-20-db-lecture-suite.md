# DB Lecture Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NestJS 기반 시나리오 드리븐 RDB 학습 프로젝트를 구축한다. TypeORM(PostgreSQL) + Prisma(MySQL) 두 ORM을 이커머스 도메인으로 6개 챕터에 걸쳐 기초→고급까지 다룬다.

**Architecture:** 단일 NestJS 앱에 챕터별 모듈. TypeORM→PostgreSQL, Prisma→MySQL. Docker Compose로 두 DB 동시 실행. 모든 주석은 한국어 튜토리얼 수준.

**Tech Stack:** NestJS 10, TypeORM 0.3, Prisma 6, PostgreSQL 16, MySQL 8.4, Docker Compose, TypeScript 5, pnpm

---

## File Map

```
db-with-nestjs/
├── docker-compose.yml
├── .env
├── package.json
├── tsconfig.json
├── nest-cli.json
├── prisma/schema.prisma
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/prisma/prisma.service.ts
│   ├── common/prisma/prisma.module.ts
│   ├── common/seed/seed.ts
│   ├── common/seed/seed-basic.ts
│   ├── common/seed/seed-bulk.ts
│   ├── ch01-shop-open/
│   │   ├── ch01.module.ts
│   │   ├── typeorm/entities/user.entity.ts
│   │   ├── typeorm/entities/product.entity.ts
│   │   ├── typeorm/ch01-typeorm.service.ts
│   │   ├── typeorm/ch01-typeorm.controller.ts
│   │   ├── prisma/ch01-prisma.service.ts
│   │   └── prisma/ch01-prisma.controller.ts
│   ├── ch02-catalog/
│   │   ├── ch02.module.ts
│   │   ├── typeorm/entities/category.entity.ts
│   │   ├── typeorm/entities/product-category.entity.ts
│   │   ├── typeorm/entities/order.entity.ts
│   │   ├── typeorm/entities/order-item.entity.ts
│   │   ├── typeorm/entities/review.entity.ts
│   │   ├── typeorm/entities/popular-products.view-entity.ts
│   │   ├── typeorm/ch02-typeorm.service.ts
│   │   ├── typeorm/ch02-typeorm.controller.ts
│   │   ├── prisma/ch02-prisma.service.ts
│   │   └── prisma/ch02-prisma.controller.ts
│   ├── ch03-order-crisis/
│   │   ├── ch03.module.ts
│   │   ├── typeorm/ch03-typeorm.service.ts
│   │   ├── typeorm/ch03-typeorm.controller.ts
│   │   ├── prisma/ch03-prisma.service.ts
│   │   └── prisma/ch03-prisma.controller.ts
│   ├── ch04-black-friday/
│   │   ├── ch04.module.ts
│   │   ├── typeorm/ch04-typeorm.service.ts
│   │   ├── typeorm/ch04-typeorm.controller.ts
│   │   ├── prisma/ch04-prisma.service.ts
│   │   └── prisma/ch04-prisma.controller.ts
│   ├── ch05-system-renewal/
│   │   ├── ch05.module.ts
│   │   ├── typeorm/migrations/
│   │   ├── typeorm/ch05-typeorm.service.ts
│   │   ├── prisma/ch05-prisma.service.ts
│   │   └── prisma/ch05-prisma.controller.ts
│   └── ch06-analytics/
│       ├── ch06.module.ts
│       ├── typeorm/ch06-typeorm.service.ts
│       ├── typeorm/ch06-typeorm.controller.ts
│       ├── prisma/ch06-prisma.service.ts
│       └── prisma/ch06-prisma.controller.ts
```

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.gitignore`

- [ ] **Step 1: NestJS 프로젝트 생성**

```bash
cd /Users/joonkyu/Desktop/develop/db-with-nestjs
pnpm dlx @nestjs/cli new . --package-manager pnpm --skip-git --strict
```

- [ ] **Step 2: 추가 의존성 설치**

```bash
pnpm add @nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer
pnpm add @prisma/client
pnpm add -D prisma @faker-js/faker ts-node
```

- [ ] **Step 3: .gitignore에 추가**

`.gitignore` 끝에 추가:
```
.env
dist/
node_modules/
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: scaffold NestJS project with dependencies"
```

---

### Task 2: Docker & 환경 설정

**Files:**
- Create: `docker-compose.yml`, `.env`

- [ ] **Step 1: docker-compose.yml 작성**

```yaml
# docker-compose.yml
# ============================================================
# 🐳 Docker Compose — PostgreSQL 16 + MySQL 8.4
# ============================================================
# 이 파일은 학습용 데이터베이스 두 개를 동시에 실행합니다.
# TypeORM은 PostgreSQL에, Prisma는 MySQL에 연결됩니다.
#
# 실행: docker compose up -d
# 종료: docker compose down
# 데이터 초기화: docker compose down -v  (볼륨까지 삭제)
# ============================================================

services:
  # ── PostgreSQL (TypeORM이 연결할 DB) ──
  postgres:
    image: postgres:16
    container_name: lecture-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: db_lecture
      POSTGRES_USER: lecture
      POSTGRES_PASSWORD: lecture1234
    volumes:
      - pg_data:/var/lib/postgresql/data

  # ── MySQL (Prisma가 연결할 DB) ──
  mysql:
    image: mysql:8.4
    container_name: lecture-mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_DATABASE: db_lecture
      MYSQL_USER: lecture
      MYSQL_PASSWORD: lecture1234
      MYSQL_ROOT_PASSWORD: root1234
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  pg_data:
  mysql_data:
```

- [ ] **Step 2: .env 작성**

```env
# ── PostgreSQL (TypeORM) ──
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=db_lecture
PG_USERNAME=lecture
PG_PASSWORD=lecture1234

# ── MySQL (Prisma) ──
DATABASE_URL="mysql://lecture:lecture1234@localhost:3306/db_lecture"
```

- [ ] **Step 3: Docker 실행 확인**

```bash
docker compose up -d
docker compose ps   # 두 컨테이너 모두 running 상태 확인
```

- [ ] **Step 4: 커밋**

```bash
git add docker-compose.yml .env
git commit -m "infra: add Docker Compose for PostgreSQL 16 + MySQL 8.4"
```

---

### Task 3: App 기본 설정 (TypeORM + Prisma 연결)

**Files:**
- Create: `src/common/prisma/prisma.service.ts`, `src/common/prisma/prisma.module.ts`
- Modify: `src/app.module.ts`, `src/main.ts`
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Prisma 초기화 & schema.prisma 작성**

```bash
pnpm prisma init --datasource-provider mysql
```

`prisma/schema.prisma`:
```prisma
// ============================================================
// 📋 Prisma 스키마 — MySQL용
// ============================================================
// Prisma는 이 파일 하나로 DB 테이블 구조를 정의합니다.
// 'model' 블록 = DB의 테이블, 필드 = 컬럼에 대응합니다.
//
// 스키마 변경 후: pnpm prisma generate (타입 생성)
// DB에 반영:     pnpm prisma db push (개발용)
// ============================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ── Ch01에서 사용할 기본 모델 ──

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())

  // Ch02에서 추가될 관계 (미리 정의)
  orders  Order[]
  reviews Review[]
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  description String?  @db.Text
  metadata    Json?
  createdAt   DateTime @default(now())

  // Ch02에서 추가될 관계
  categories ProductCategory[]
  orderItems OrderItem[]
  reviews    Review[]
}

// ── Ch02에서 학습할 관계 모델 ──

model Category {
  id       Int               @id @default(autoincrement())
  name     String            @unique
  products ProductCategory[]
}

// N:M 관계의 중간 테이블 — Product와 Category를 연결
model ProductCategory {
  productId  Int
  categoryId Int
  product    Product  @relation(fields: [productId], references: [id])
  category   Category @relation(fields: [categoryId], references: [id])

  @@id([productId, categoryId])
}

model Order {
  id          Int         @id @default(autoincrement())
  userId      Int
  totalAmount Decimal     @db.Decimal(12, 2)
  status      String      @default("PENDING")
  createdAt   DateTime    @default(now())
  user        User        @relation(fields: [userId], references: [id])
  orderItems  OrderItem[]
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
}

model Review {
  id        Int      @id @default(autoincrement())
  userId    Int
  productId Int
  rating    Int
  content   String?  @db.Text
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  product   Product  @relation(fields: [productId], references: [id])
}
```

- [ ] **Step 2: Prisma Client 생성 & DB Push**

```bash
pnpm prisma generate
pnpm prisma db push
```

- [ ] **Step 3: PrismaService 작성**

`src/common/prisma/prisma.service.ts`:
```typescript
// ============================================================
// 🔧 PrismaService — Prisma Client를 NestJS에서 사용하기 위한 래퍼
// ============================================================
// Prisma Client는 DB 연결을 관리하는 객체입니다.
// NestJS의 라이프사이클(시작/종료)에 맞춰 연결을 열고 닫아야 합니다.
//
// - OnModuleInit: 모듈이 초기화될 때 DB 연결
// - OnModuleDestroy: 앱이 종료될 때 DB 연결 해제
// ============================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // 앱 시작 시 MySQL에 연결합니다
    await this.$connect();
  }

  async onModuleDestroy() {
    // 앱 종료 시 연결을 정리합니다 (메모리 누수 방지)
    await this.$disconnect();
  }
}
```

`src/common/prisma/prisma.module.ts`:
```typescript
// PrismaModule — PrismaService를 다른 모듈에서 사용 가능하게 내보냄
// @Global()을 사용하면 모든 모듈에서 import 없이 PrismaService를 주입 가능

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: app.module.ts 수정**

`src/app.module.ts`:
```typescript
// ============================================================
// 🏠 AppModule — 앱의 루트(최상위) 모듈
// ============================================================
// NestJS 앱은 모듈 트리 구조입니다. AppModule이 루트이고,
// 각 챕터 모듈이 여기에 import되어 앱에 등록됩니다.
//
// DB 연결 설정:
// - TypeORM → PostgreSQL (포트 5432)
// - Prisma → MySQL (포트 3306, PrismaModule에서 관리)
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    // ── 환경변수 로드 (.env 파일) ──
    // isGlobal: true → 모든 모듈에서 ConfigService 사용 가능
    ConfigModule.forRoot({ isGlobal: true }),

    // ── TypeORM → PostgreSQL 연결 ──
    // forRootAsync: 환경변수를 비동기로 읽어서 설정
    // synchronize: true → 엔티티 변경 시 자동으로 테이블 구조 반영 (개발 전용!)
    // autoLoadEntities: true → forFeature()로 등록된 엔티티를 자동 감지
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('PG_HOST'),
        port: config.get<number>('PG_PORT'),
        database: config.get('PG_DATABASE'),
        username: config.get('PG_USERNAME'),
        password: config.get('PG_PASSWORD'),
        autoLoadEntities: true,
        synchronize: true, // ⚠️ 프로덕션에서는 절대 true로 쓰지 마세요! (Ch05에서 학습)
        logging: true,     // 실행되는 SQL을 콘솔에 출력 (학습용)
      }),
    }),

    // ── Prisma → MySQL 연결 (전역 모듈) ──
    PrismaModule,

    // ── 챕터 모듈들 (구현하면서 하나씩 추가) ──
    // Ch01Module,
    // Ch02Module,
    // Ch03Module,
    // Ch04Module,
    // Ch05Module,
    // Ch06Module,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: main.ts 수정**

`src/main.ts`:
```typescript
// ============================================================
// 🚀 main.ts — NestJS 앱의 진입점
// ============================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // DTO 검증 파이프 — class-validator 데코레이터로 입력값 자동 검증
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(3000);
  console.log('🚀 서버 시작: http://localhost:3000');
}
bootstrap();
```

- [ ] **Step 6: 빌드 확인**

```bash
pnpm build
```
Expected: 에러 없이 dist/ 생성

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: configure TypeORM(PostgreSQL) + Prisma(MySQL) connection"
```

---

### Task 4: Ch01 "쇼핑몰 오픈" — TypeORM 엔티티 & 서비스

**Files:**
- Create: `src/ch01-shop-open/typeorm/entities/user.entity.ts`
- Create: `src/ch01-shop-open/typeorm/entities/product.entity.ts`
- Create: `src/ch01-shop-open/typeorm/ch01-typeorm.service.ts`
- Create: `src/ch01-shop-open/typeorm/ch01-typeorm.controller.ts`

- [ ] **Step 1: User 엔티티**

`src/ch01-shop-open/typeorm/entities/user.entity.ts`:
```typescript
// ============================================================
// 👤 User 엔티티 — "고객" 테이블
// ============================================================
// 엔티티(Entity)란?
//   데이터베이스의 테이블 1개 = TypeScript 클래스 1개입니다.
//   클래스의 속성(property) = 테이블의 컬럼(column)에 대응합니다.
//
// 데코레이터(Decorator)란?
//   @로 시작하는 특수 함수로, 클래스나 속성에 "메타데이터"를 붙입니다.
//   TypeORM은 이 데코레이터를 읽어서 자동으로 SQL을 생성합니다.
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
// OneToMany는 Ch02에서 관계를 연결할 때 사용합니다 (미리 import)

@Entity('users') // 이 클래스가 DB의 'users' 테이블과 매핑됨을 선언
export class User {
  // ── 기본 키 (Primary Key) ──
  // 모든 테이블에는 각 행(row)을 고유하게 식별하는 컬럼이 필요합니다.
  // 'increment' → 1, 2, 3, ... 자동 증가하는 정수 ID
  @PrimaryGeneratedColumn()
  id: number;

  // ── 이메일 (유니크 제약) ──
  // unique: true → 같은 이메일로 두 명의 유저를 만들 수 없음
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // ── 이름 ──
  @Column({ type: 'varchar', length: 100 })
  name: string;

  // ── 생성일시 ──
  // CreateDateColumn → INSERT 시 자동으로 현재 시간이 들어감
  @CreateDateColumn()
  createdAt: Date;

  // ── 관계 필드 (Ch02에서 활성화) ──
  // 한 명의 유저는 여러 개의 주문을 가질 수 있습니다 (1:N)
  // 아직 Order 엔티티가 없으므로 주석 처리. Ch02에서 연결합니다.
  // @OneToMany(() => Order, (order) => order.user)
  // orders: Order[];
}
```

- [ ] **Step 2: Product 엔티티**

`src/ch01-shop-open/typeorm/entities/product.entity.ts`:
```typescript
// ============================================================
// 📦 Product 엔티티 — "상품" 테이블
// ============================================================
// 다양한 컬럼 타입을 보여주는 예시입니다.
// PostgreSQL의 타입 시스템이 MySQL보다 풍부합니다.
//   - decimal: 정확한 소수점 연산 (가격에 필수!)
//   - text: 길이 제한 없는 문자열
//   - jsonb: JSON 데이터 저장 (PostgreSQL 전용, Ch06에서 학습)
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  // ── 상품명 ──
  @Column({ type: 'varchar', length: 200 })
  name: string;

  // ── 가격 ──
  // decimal(10,2) → 최대 10자리, 소수점 2자리
  // 예: 99999999.99 까지 저장 가능
  // ⚠️ float를 쓰면 안 되는 이유: 0.1 + 0.2 = 0.30000000000000004 (부동소수점 오차)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  // ── 재고 수량 ──
  @Column({ type: 'int', default: 0 })
  stock: number;

  // ── 상품 설명 (선택 입력) ──
  // nullable: true → NULL 허용 (입력하지 않아도 됨)
  // text 타입 → varchar와 달리 길이 제한 없음
  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ── 메타데이터 (Ch06에서 JSONB 학습용) ──
  // PostgreSQL의 jsonb 타입: JSON을 바이너리로 저장해 검색이 빠름
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 3: Ch01 TypeORM 서비스**

`src/ch01-shop-open/typeorm/ch01-typeorm.service.ts`:
```typescript
// ============================================================
// 🏪 Ch01TypeormService — TypeORM으로 기본 CRUD 수행
// ============================================================
// Repository 패턴:
//   TypeORM은 각 엔티티마다 "Repository"라는 객체를 제공합니다.
//   Repository = 특정 테이블에 대한 CRUD 작업을 수행하는 도구
//
// 의존성 주입 (Dependency Injection):
//   @InjectRepository(User) → NestJS가 UserRepository를 자동으로 넣어줌
//   직접 new Repository()를 하지 않아도 됩니다.
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class Ch01TypeormService {
  constructor(
    // UserRepository를 주입받습니다
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // ── 유저 생성 ──
  // save() = INSERT SQL을 실행합니다
  // 반환값: 생성된 유저 객체 (id가 자동으로 채워져 있음)
  async createUser(email: string, name: string): Promise<User> {
    const user = this.userRepo.create({ email, name });
    return this.userRepo.save(user);
  }

  // ── 유저 전체 조회 ──
  // find() = SELECT * FROM users
  async findAllUsers(): Promise<User[]> {
    return this.userRepo.find();
  }

  // ── 상품 등록 ──
  async createProduct(data: {
    name: string;
    price: number;
    stock: number;
    description?: string;
  }): Promise<Product> {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  // ── 상품 전체 조회 ──
  async findAllProducts(): Promise<Product[]> {
    return this.productRepo.find();
  }
}
```

- [ ] **Step 4: Ch01 TypeORM 컨트롤러**

`src/ch01-shop-open/typeorm/ch01-typeorm.controller.ts`:
```typescript
// ============================================================
// 🌐 Ch01TypeormController — HTTP 요청을 받아 서비스에 전달
// ============================================================
// Controller의 역할:
//   1. HTTP 요청(GET, POST 등)을 받는다
//   2. 요청 데이터를 꺼낸다 (Body, Param, Query)
//   3. Service에 비즈니스 로직을 위임한다
//   4. 결과를 JSON으로 응답한다
//
// 라우트 경로: /ch01/typeorm/...
// ============================================================

import { Controller, Get, Post, Body } from '@nestjs/common';
import { Ch01TypeormService } from './ch01-typeorm.service';

@Controller('ch01/typeorm') // 이 컨트롤러의 모든 경로 앞에 'ch01/typeorm' 접두사
export class Ch01TypeormController {
  constructor(private readonly service: Ch01TypeormService) {}

  // POST /ch01/typeorm/users — 유저 생성
  // Body 예시: { "email": "test@test.com", "name": "홍길동" }
  @Post('users')
  createUser(@Body() body: { email: string; name: string }) {
    return this.service.createUser(body.email, body.name);
  }

  // GET /ch01/typeorm/users — 유저 목록 조회
  @Get('users')
  findAllUsers() {
    return this.service.findAllUsers();
  }

  // POST /ch01/typeorm/products — 상품 등록
  @Post('products')
  createProduct(
    @Body() body: { name: string; price: number; stock: number; description?: string },
  ) {
    return this.service.createProduct(body);
  }

  // GET /ch01/typeorm/products — 상품 목록 조회
  @Get('products')
  findAllProducts() {
    return this.service.findAllProducts();
  }
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/ch01-shop-open/typeorm/
git commit -m "feat(ch01): add TypeORM User/Product entities, service, controller"
```

---

### Task 5: Ch01 "쇼핑몰 오픈" — Prisma 서비스 & 모듈

**Files:**
- Create: `src/ch01-shop-open/prisma/ch01-prisma.service.ts`
- Create: `src/ch01-shop-open/prisma/ch01-prisma.controller.ts`
- Create: `src/ch01-shop-open/ch01.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Ch01 Prisma 서비스**

`src/ch01-shop-open/prisma/ch01-prisma.service.ts`:
```typescript
// ============================================================
// 🏪 Ch01PrismaService — Prisma로 기본 CRUD 수행 (MySQL)
// ============================================================
// TypeORM과의 차이점:
//   - TypeORM: Repository 패턴 (엔티티별 Repository 객체)
//   - Prisma: Client 패턴 (하나의 PrismaClient로 모든 모델 접근)
//
// Prisma의 장점:
//   - 자동 완성이 매우 강력 (prisma.user.create → 타입이 자동 추론됨)
//   - schema.prisma에서 모델을 정의하면 TypeScript 타입이 자동 생성
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class Ch01PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 유저 생성 ──
  // prisma.user.create() → INSERT INTO users ...
  // data 객체의 타입은 Prisma가 schema.prisma에서 자동 생성합니다
  async createUser(email: string, name: string) {
    return this.prisma.user.create({
      data: { email, name },
    });
  }

  // ── 유저 전체 조회 ──
  // prisma.user.findMany() → SELECT * FROM users
  async findAllUsers() {
    return this.prisma.user.findMany();
  }

  // ── 상품 등록 ──
  async createProduct(data: {
    name: string;
    price: number;
    stock: number;
    description?: string;
  }) {
    return this.prisma.product.create({ data });
  }

  // ── 상품 전체 조회 ──
  async findAllProducts() {
    return this.prisma.product.findMany();
  }
}
```

- [ ] **Step 2: Ch01 Prisma 컨트롤러**

`src/ch01-shop-open/prisma/ch01-prisma.controller.ts`:
```typescript
// Ch01 Prisma 컨트롤러 — TypeORM 버전과 동일한 엔드포인트, 다른 DB(MySQL)
// 라우트 경로: /ch01/prisma/...

import { Controller, Get, Post, Body } from '@nestjs/common';
import { Ch01PrismaService } from './ch01-prisma.service';

@Controller('ch01/prisma')
export class Ch01PrismaController {
  constructor(private readonly service: Ch01PrismaService) {}

  @Post('users')
  createUser(@Body() body: { email: string; name: string }) {
    return this.service.createUser(body.email, body.name);
  }

  @Get('users')
  findAllUsers() {
    return this.service.findAllUsers();
  }

  @Post('products')
  createProduct(
    @Body() body: { name: string; price: number; stock: number; description?: string },
  ) {
    return this.service.createProduct(body);
  }

  @Get('products')
  findAllProducts() {
    return this.service.findAllProducts();
  }
}
```

- [ ] **Step 3: Ch01 모듈**

`src/ch01-shop-open/ch01.module.ts`:
```typescript
// ============================================================
// 📦 Ch01Module — "쇼핑몰 오픈" 챕터 모듈
// ============================================================
// NestJS의 모듈 시스템:
//   모듈 = 관련된 코드를 하나로 묶는 단위
//   - imports: 이 모듈이 사용할 다른 모듈
//   - controllers: HTTP 요청을 처리하는 컨트롤러
//   - providers: 비즈니스 로직을 담당하는 서비스
//
// TypeOrmModule.forFeature([Entity]):
//   이 모듈에서 사용할 TypeORM 엔티티를 등록합니다.
//   등록해야 @InjectRepository(Entity)로 주입 가능!
// ============================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './typeorm/entities/user.entity';
import { Product } from './typeorm/entities/product.entity';
import { Ch01TypeormService } from './typeorm/ch01-typeorm.service';
import { Ch01TypeormController } from './typeorm/ch01-typeorm.controller';
import { Ch01PrismaService } from './prisma/ch01-prisma.service';
import { Ch01PrismaController } from './prisma/ch01-prisma.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product])],
  controllers: [Ch01TypeormController, Ch01PrismaController],
  providers: [Ch01TypeormService, Ch01PrismaService],
})
export class Ch01Module {}
```

- [ ] **Step 4: AppModule에 Ch01Module 등록**

`src/app.module.ts`에서 Ch01Module import 주석 해제:
```typescript
import { Ch01Module } from './ch01-shop-open/ch01.module';

// imports 배열에 추가:
Ch01Module,
```

- [ ] **Step 5: 앱 실행 & 검증**

```bash
pnpm start:dev
```

```bash
# 유저 생성 (PostgreSQL)
curl -X POST http://localhost:3000/ch01/typeorm/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pg.com","name":"PG유저"}'

# 유저 생성 (MySQL)
curl -X POST http://localhost:3000/ch01/prisma/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mysql.com","name":"MySQL유저"}'

# 유저 목록 조회
curl http://localhost:3000/ch01/typeorm/users
curl http://localhost:3000/ch01/prisma/users
```

Expected: 양쪽 모두 생성된 유저 JSON 응답

- [ ] **Step 6: 커밋**

```bash
git add src/ch01-shop-open/ src/app.module.ts
git commit -m "feat(ch01): complete Shop Open chapter — TypeORM(PG) + Prisma(MySQL)"
```

---

### Task 6: Ch02 "상품 카탈로그" — TypeORM 관계 엔티티

**Files:**
- Create: `src/ch02-catalog/typeorm/entities/category.entity.ts`
- Create: `src/ch02-catalog/typeorm/entities/product-category.entity.ts`
- Create: `src/ch02-catalog/typeorm/entities/order.entity.ts`
- Create: `src/ch02-catalog/typeorm/entities/order-item.entity.ts`
- Create: `src/ch02-catalog/typeorm/entities/review.entity.ts`
- Create: `src/ch02-catalog/typeorm/entities/popular-products.view-entity.ts`
- Modify: `src/ch01-shop-open/typeorm/entities/user.entity.ts` (관계 활성화)
- Modify: `src/ch01-shop-open/typeorm/entities/product.entity.ts` (관계 활성화)

- [ ] **Step 1: Category 엔티티**

`src/ch02-catalog/typeorm/entities/category.entity.ts`:
```typescript
// ============================================================
// 🏷️ Category 엔티티 — "카테고리" 테이블
// ============================================================
// N:M (다대다) 관계의 한 쪽입니다.
// 하나의 상품은 여러 카테고리에 속할 수 있고,
// 하나의 카테고리에는 여러 상품이 있을 수 있습니다.
// 예: "전자기기" 카테고리 ↔ 노트북, 스마트폰, 태블릿
// ============================================================

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductCategory } from './product-category.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  // N:M 관계를 중간 테이블(ProductCategory)로 연결
  @OneToMany(() => ProductCategory, (pc) => pc.category)
  productCategories: ProductCategory[];
}
```

- [ ] **Step 2: ProductCategory 중간 테이블 엔티티**

`src/ch02-catalog/typeorm/entities/product-category.entity.ts`:
```typescript
// ============================================================
// 🔗 ProductCategory — N:M 관계의 "중간 테이블"
// ============================================================
// N:M(다대다) 관계는 DB에서 직접 표현할 수 없습니다.
// 대신 "중간 테이블"을 두어 두 개의 1:N 관계로 분해합니다.
//
//   Product ─(1:N)─ ProductCategory ─(N:1)─ Category
//
// 왜 @ManyToMany + @JoinTable 대신 중간 엔티티를 쓰나?
//   → 중간 테이블에 추가 컬럼(예: 등록일)을 넣을 수 있어 실무에서 더 유연합니다.
// ============================================================

import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { Category } from './category.entity';

@Entity('product_categories')
export class ProductCategory {
  @PrimaryColumn()
  productId: number;

  @PrimaryColumn()
  categoryId: number;

  // ManyToOne: "이 중간 행"은 하나의 Product에 속함
  @ManyToOne(() => Product, (product) => product.productCategories, {
    onDelete: 'CASCADE', // 상품 삭제 시 연결도 자동 삭제
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Category, (category) => category.productCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
```

- [ ] **Step 3: Order 엔티티**

`src/ch02-catalog/typeorm/entities/order.entity.ts`:
```typescript
// ============================================================
// 🛒 Order 엔티티 — "주문" 테이블
// ============================================================
// 1:N 관계 (한 유저 → 여러 주문):
//   User.id를 외래 키(FK)로 참조합니다.
//   외래 키 = "이 주문이 어떤 유저의 것인지" 연결하는 컬럼
//
// enum 타입:
//   주문 상태처럼 정해진 값만 허용할 때 사용합니다.
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../ch01-shop-open/typeorm/entities/user.entity';
import { OrderItem } from './order-item.entity';

// 주문 상태를 TypeScript enum으로 정의
export enum OrderStatus {
  PENDING = 'PENDING',       // 결제 대기
  PAID = 'PAID',             // 결제 완료
  SHIPPED = 'SHIPPED',       // 배송 중
  DELIVERED = 'DELIVERED',   // 배송 완료
  CANCELLED = 'CANCELLED',   // 취소
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  // ── 외래 키 (FK) — 이 주문의 소유자 ──
  @Column()
  userId: number;

  // ManyToOne: "여러 주문"이 "하나의 유저"에 속함
  // JoinColumn: userId 컬럼이 FK임을 명시
  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  // 1:N — 하나의 주문에 여러 주문 항목
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  orderItems: OrderItem[];
}
```

- [ ] **Step 4: OrderItem 엔티티**

`src/ch02-catalog/typeorm/entities/order-item.entity.ts`:
```typescript
// ============================================================
// 📋 OrderItem 엔티티 — "주문 상세" 테이블
// ============================================================
// 하나의 주문에는 여러 상품이 포함될 수 있습니다.
// OrderItem은 "어떤 주문에 어떤 상품이 몇 개, 얼마에 포함됐는지"를 기록합니다.
//
// 왜 Order에 직접 상품 정보를 넣지 않나?
//   → 정규화(Normalization): 데이터 중복을 없애고 일관성을 유지하기 위해
//     주문과 상품 정보를 별도 테이블로 분리합니다.
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column()
  productId: number;

  @Column({ type: 'int' })
  quantity: number;

  // unitPrice를 별도로 저장하는 이유:
  // 상품 가격이 나중에 변경되더라도 "주문 당시 가격"을 보존하기 위함
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @ManyToOne(() => Order, (order) => order.orderItems)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Product, (product) => product.orderItems)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
```

- [ ] **Step 5: Review 엔티티**

`src/ch02-catalog/typeorm/entities/review.entity.ts`:
```typescript
// ============================================================
// ⭐ Review 엔티티 — "리뷰" 테이블
// ============================================================
// 두 개의 외래 키를 가진 테이블:
//   - userId → 리뷰를 작성한 유저
//   - productId → 리뷰 대상 상품
// 이처럼 하나의 테이블이 여러 테이블을 참조할 수 있습니다.
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../ch01-shop-open/typeorm/entities/user.entity';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  productId: number;

  // rating: 1~5 사이 정수
  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.reviews)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Product, (product) => product.reviews)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
```

- [ ] **Step 6: User, Product 엔티티에 관계 필드 추가**

`src/ch01-shop-open/typeorm/entities/user.entity.ts` — 주석 처리된 관계를 활성화:
```typescript
// 기존 import에 추가:
import { Order } from '../../../ch02-catalog/typeorm/entities/order.entity';
import { Review } from '../../../ch02-catalog/typeorm/entities/review.entity';

// 클래스 내부에 추가 (createdAt 아래):
  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];
```

`src/ch01-shop-open/typeorm/entities/product.entity.ts` — 관계 필드 추가:
```typescript
// 기존 import에 추가:
import { OneToMany } from 'typeorm';
import { ProductCategory } from '../../../ch02-catalog/typeorm/entities/product-category.entity';
import { OrderItem } from '../../../ch02-catalog/typeorm/entities/order-item.entity';
import { Review } from '../../../ch02-catalog/typeorm/entities/review.entity';

// 클래스 내부에 추가:
  @OneToMany(() => ProductCategory, (pc) => pc.product)
  productCategories: ProductCategory[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];
```

- [ ] **Step 7: PopularProducts 뷰 엔티티**

`src/ch02-catalog/typeorm/entities/popular-products.view-entity.ts`:
```typescript
// ============================================================
// 👁️ PopularProducts — 데이터베이스 뷰 (View)
// ============================================================
// 뷰(View)란?
//   자주 사용하는 복잡한 쿼리를 "가상 테이블"로 저장한 것입니다.
//   실제 데이터를 저장하지 않고, 조회할 때마다 쿼리가 실행됩니다.
//
// 이 뷰는 "리뷰 평균 평점이 높은 상품 TOP" 목록을 보여줍니다.
// SELECT 쿼리를 매번 작성하는 대신 뷰 하나로 간단히 조회 가능!
// ============================================================

import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'popular_products_view',
  expression: `
    SELECT
      p.id AS "productId",
      p.name AS "productName",
      COALESCE(AVG(r.rating), 0) AS "avgRating",
      COUNT(r.id) AS "reviewCount"
    FROM products p
    LEFT JOIN reviews r ON r."productId" = p.id
    GROUP BY p.id, p.name
    ORDER BY "avgRating" DESC, "reviewCount" DESC
  `,
})
export class PopularProductsView {
  @ViewColumn()
  productId: number;

  @ViewColumn()
  productName: string;

  @ViewColumn()
  avgRating: number;

  @ViewColumn()
  reviewCount: number;
}
```

- [ ] **Step 8: 커밋**

```bash
git add src/ch02-catalog/typeorm/entities/ src/ch01-shop-open/typeorm/entities/
git commit -m "feat(ch02): add relation entities — Category, Order, OrderItem, Review, View"
```

---

### Task 7: Ch02 — TypeORM 서비스 & 컨트롤러

**Files:**
- Create: `src/ch02-catalog/typeorm/ch02-typeorm.service.ts`
- Create: `src/ch02-catalog/typeorm/ch02-typeorm.controller.ts`

- [ ] **Step 1: Ch02 TypeORM 서비스**

`src/ch02-catalog/typeorm/ch02-typeorm.service.ts`:
```typescript
// ============================================================
// 📦 Ch02TypeormService — 관계 데이터 CRUD + Query Builder
// ============================================================
// 이 챕터에서 학습하는 핵심:
//   1. 관계가 있는 데이터를 생성/조회하는 방법
//   2. Query Builder로 SQL과 비슷한 쿼리를 코드로 작성하는 방법
//   3. 뷰(View)를 통한 복잡한 조회 간소화
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Review } from './entities/review.entity';
import { PopularProductsView } from './entities/popular-products.view-entity';

@Injectable()
export class Ch02TypeormService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(ProductCategory)
    private readonly pcRepo: Repository<ProductCategory>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(PopularProductsView)
    private readonly popularRepo: Repository<PopularProductsView>,
    private readonly dataSource: DataSource,
  ) {}

  // ── 카테고리 생성 ──
  async createCategory(name: string) {
    return this.categoryRepo.save(this.categoryRepo.create({ name }));
  }

  // ── 상품-카테고리 연결 (N:M) ──
  // 중간 테이블에 행을 추가하여 두 엔티티를 연결합니다
  async linkProductToCategory(productId: number, categoryId: number) {
    return this.pcRepo.save({ productId, categoryId });
  }

  // ── 주문 생성 (OrderItem 포함) ──
  // cascade: true 덕분에 Order를 저장하면 OrderItem도 자동 저장됩니다
  async createOrder(
    userId: number,
    items: { productId: number; quantity: number; unitPrice: number }[],
  ) {
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const order = this.orderRepo.create({
      userId,
      totalAmount,
      status: OrderStatus.PENDING,
      orderItems: items.map((item) =>
        Object.assign(new OrderItem(), item),
      ),
    });

    return this.orderRepo.save(order);
  }

  // ── 리뷰 작성 ──
  async createReview(userId: number, productId: number, rating: number, content?: string) {
    return this.reviewRepo.save(
      this.reviewRepo.create({ userId, productId, rating, content }),
    );
  }

  // ── 상품의 리뷰 조회 (관계 로딩) ──
  // relations 옵션: JOIN하여 연관 데이터를 함께 가져옴
  async findProductReviews(productId: number) {
    return this.reviewRepo.find({
      where: { productId },
      relations: ['user'], // 리뷰 작성자 정보도 함께
      order: { createdAt: 'DESC' },
    });
  }

  // ── Query Builder 기초: 카테고리별 상품 조회 ──
  // createQueryBuilder = SQL을 코드로 작성하는 도구
  // SELECT p.* FROM products p
  //   INNER JOIN product_categories pc ON pc."productId" = p.id
  //   WHERE pc."categoryId" = :categoryId
  //   ORDER BY p.name ASC
  //   LIMIT 20
  async findProductsByCategory(categoryId: number) {
    return this.dataSource
      .getRepository(Product)
      .createQueryBuilder('p')
      .innerJoin('p.productCategories', 'pc')
      .where('pc.categoryId = :categoryId', { categoryId })
      .orderBy('p.name', 'ASC')
      .limit(20)
      .getMany();
  }

  // ── 인기 상품 뷰 조회 ──
  async findPopularProducts() {
    return this.popularRepo.find();
  }
}
```

- [ ] **Step 2: Ch02 TypeORM 컨트롤러**

`src/ch02-catalog/typeorm/ch02-typeorm.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { Ch02TypeormService } from './ch02-typeorm.service';

@Controller('ch02/typeorm')
export class Ch02TypeormController {
  constructor(private readonly service: Ch02TypeormService) {}

  @Post('categories')
  createCategory(@Body() body: { name: string }) {
    return this.service.createCategory(body.name);
  }

  // POST /ch02/typeorm/products/1/categories — 상품 1에 카테고리 연결
  @Post('products/:id/categories')
  linkCategory(
    @Param('id', ParseIntPipe) productId: number,
    @Body() body: { categoryId: number },
  ) {
    return this.service.linkProductToCategory(productId, body.categoryId);
  }

  @Post('orders')
  createOrder(
    @Body()
    body: {
      userId: number;
      items: { productId: number; quantity: number; unitPrice: number }[];
    },
  ) {
    return this.service.createOrder(body.userId, body.items);
  }

  @Post('reviews')
  createReview(
    @Body() body: { userId: number; productId: number; rating: number; content?: string },
  ) {
    return this.service.createReview(body.userId, body.productId, body.rating, body.content);
  }

  @Get('products/:id/reviews')
  findProductReviews(@Param('id', ParseIntPipe) productId: number) {
    return this.service.findProductReviews(productId);
  }

  @Get('categories/:id/products')
  findProductsByCategory(@Param('id', ParseIntPipe) categoryId: number) {
    return this.service.findProductsByCategory(categoryId);
  }

  @Get('popular-products')
  findPopularProducts() {
    return this.service.findPopularProducts();
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/ch02-catalog/typeorm/ch02-typeorm.service.ts src/ch02-catalog/typeorm/ch02-typeorm.controller.ts
git commit -m "feat(ch02): add TypeORM catalog service with QueryBuilder and View"
```

---

### Task 8: Ch02 — Prisma 서비스 & 모듈

**Files:**
- Create: `src/ch02-catalog/prisma/ch02-prisma.service.ts`
- Create: `src/ch02-catalog/prisma/ch02-prisma.controller.ts`
- Create: `src/ch02-catalog/ch02.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Ch02 Prisma 서비스**

`src/ch02-catalog/prisma/ch02-prisma.service.ts`:
```typescript
// ============================================================
// 📦 Ch02PrismaService — Prisma로 관계 데이터 CRUD (MySQL)
// ============================================================
// TypeORM과의 주요 차이:
//   - TypeORM: @OneToMany, @ManyToOne 데코레이터로 관계 정의
//   - Prisma: schema.prisma의 relation 필드로 관계 정의
//   - TypeORM: createQueryBuilder()로 복잡한 쿼리
//   - Prisma: include/select로 관계 로딩, $queryRaw로 원시 SQL
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class Ch02PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(name: string) {
    return this.prisma.category.create({ data: { name } });
  }

  // ── N:M 연결 — 중간 테이블에 레코드 생성 ──
  async linkProductToCategory(productId: number, categoryId: number) {
    return this.prisma.productCategory.create({
      data: { productId, categoryId },
    });
  }

  // ── 주문 생성 (중첩 create) ──
  // Prisma의 강점: 중첩된 관계 데이터를 한 번의 호출로 생성
  async createOrder(
    userId: number,
    items: { productId: number; quantity: number; unitPrice: number }[],
  ) {
    const totalAmount = items.reduce(
      (sum, i) => sum + i.quantity * Number(i.unitPrice),
      0,
    );

    return this.prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: 'PENDING',
        // create: 관계 데이터를 함께 INSERT
        orderItems: { create: items },
      },
      // include: 생성 결과에 관계 데이터 포함
      include: { orderItems: true },
    });
  }

  async createReview(userId: number, productId: number, rating: number, content?: string) {
    return this.prisma.review.create({
      data: { userId, productId, rating, content },
    });
  }

  // ── 관계 로딩 — include로 JOIN 효과 ──
  async findProductReviews(productId: number) {
    return this.prisma.review.findMany({
      where: { productId },
      include: { user: true }, // 리뷰 작성자 정보 포함
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProductsByCategory(categoryId: number) {
    return this.prisma.product.findMany({
      where: {
        categories: { some: { categoryId } },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }

  // ── 뷰 조회 — $queryRaw로 원시 SQL 실행 ──
  async findPopularProducts() {
    return this.prisma.$queryRaw`
      SELECT
        p.id AS productId,
        p.name AS productName,
        COALESCE(AVG(r.rating), 0) AS avgRating,
        COUNT(r.id) AS reviewCount
      FROM Product p
      LEFT JOIN Review r ON r.productId = p.id
      GROUP BY p.id, p.name
      ORDER BY avgRating DESC, reviewCount DESC
    `;
  }
}
```

- [ ] **Step 2: Ch02 Prisma 컨트롤러**

`src/ch02-catalog/prisma/ch02-prisma.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { Ch02PrismaService } from './ch02-prisma.service';

@Controller('ch02/prisma')
export class Ch02PrismaController {
  constructor(private readonly service: Ch02PrismaService) {}

  @Post('categories')
  createCategory(@Body() body: { name: string }) {
    return this.service.createCategory(body.name);
  }

  @Post('products/:id/categories')
  linkCategory(
    @Param('id', ParseIntPipe) productId: number,
    @Body() body: { categoryId: number },
  ) {
    return this.service.linkProductToCategory(productId, body.categoryId);
  }

  @Post('orders')
  createOrder(
    @Body() body: {
      userId: number;
      items: { productId: number; quantity: number; unitPrice: number }[];
    },
  ) {
    return this.service.createOrder(body.userId, body.items);
  }

  @Post('reviews')
  createReview(
    @Body() body: { userId: number; productId: number; rating: number; content?: string },
  ) {
    return this.service.createReview(body.userId, body.productId, body.rating, body.content);
  }

  @Get('products/:id/reviews')
  findProductReviews(@Param('id', ParseIntPipe) productId: number) {
    return this.service.findProductReviews(productId);
  }

  @Get('categories/:id/products')
  findProductsByCategory(@Param('id', ParseIntPipe) categoryId: number) {
    return this.service.findProductsByCategory(categoryId);
  }

  @Get('popular-products')
  findPopularProducts() {
    return this.service.findPopularProducts();
  }
}
```

- [ ] **Step 3: Ch02 모듈**

`src/ch02-catalog/ch02.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './typeorm/entities/category.entity';
import { ProductCategory } from './typeorm/entities/product-category.entity';
import { Order } from './typeorm/entities/order.entity';
import { OrderItem } from './typeorm/entities/order-item.entity';
import { Review } from './typeorm/entities/review.entity';
import { PopularProductsView } from './typeorm/entities/popular-products.view-entity';
import { Ch02TypeormService } from './typeorm/ch02-typeorm.service';
import { Ch02TypeormController } from './typeorm/ch02-typeorm.controller';
import { Ch02PrismaService } from './prisma/ch02-prisma.service';
import { Ch02PrismaController } from './prisma/ch02-prisma.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      ProductCategory,
      Order,
      OrderItem,
      Review,
      PopularProductsView,
    ]),
  ],
  controllers: [Ch02TypeormController, Ch02PrismaController],
  providers: [Ch02TypeormService, Ch02PrismaService],
})
export class Ch02Module {}
```

- [ ] **Step 4: AppModule에 Ch02Module 추가**

```typescript
import { Ch02Module } from './ch02-catalog/ch02.module';
// imports 배열에 Ch02Module 추가
```

- [ ] **Step 5: 빌드 확인**

```bash
pnpm build
```

- [ ] **Step 6: 커밋**

```bash
git add src/ch02-catalog/ src/app.module.ts
git commit -m "feat(ch02): complete Catalog chapter — relations, CRUD, QueryBuilder, View"
```

---

### Task 9: 시드 스크립트

**Files:**
- Create: `src/common/seed/seed-basic.ts`
- Create: `src/common/seed/seed-bulk.ts`
- Create: `src/common/seed/seed.ts`
- Modify: `package.json` (scripts 추가)

- [ ] **Step 1: seed-basic.ts (소량 시드)**

`src/common/seed/seed-basic.ts`:
```typescript
// ============================================================
// 🌱 seed-basic — Ch01~02 학습용 소량 데이터
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
  // ── TypeORM (PostgreSQL) 연결 ──
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

  // ── Prisma (MySQL) 연결 ──
  const prisma = new PrismaClient();

  console.log('🌱 Basic seed 시작...');

  // ── Users (10명) ──
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

  // ── Categories (5개) ──
  const categoryNames = ['전자기기', '의류', '식품', '도서', '스포츠'];
  const pgCategories: Category[] = [];
  for (const name of categoryNames) {
    const cat = await pg.getRepository(Category).save({ name });
    pgCategories.push(cat);
    await prisma.category.create({ data: { name } });
  }

  // ── Products (30개) ──
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

  // ── ProductCategory 연결 ──
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

  // ── Orders (20건) + OrderItems (약 60건) ──
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

    const order = await pg.getRepository(Order).save({
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

  // ── Reviews (50개) ──
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

  console.log('✅ Basic seed 완료!');
  await pg.destroy();
  await prisma.$disconnect();
}
```

- [ ] **Step 2: seed-bulk.ts (대량 시드)**

`src/common/seed/seed-bulk.ts`:
```typescript
// ============================================================
// 🌱 seed-bulk — Ch03~06 성능 체감용 대량 데이터
// ============================================================
// Product 50,000 / Order 100,000 / OrderItem ~400,000
// 배치 INSERT로 빠르게 삽입합니다.
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

export async function seedBulk() {
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
  const prisma = new PrismaClient();

  console.log('🌱 Bulk seed 시작 (시간이 걸립니다)...');

  // ── Users 100명 ──
  const userIds: number[] = [];
  for (let i = 0; i < 100; i++) {
    const email = `bulk${i}@test.com`;
    const name = faker.person.fullName();
    const u = await pg.getRepository(User).save({ email, name });
    userIds.push(u.id);
    await prisma.user.create({ data: { email, name } });
  }
  console.log('  Users: 100');

  // ── Categories 20개 ──
  const catIds: number[] = [];
  for (let i = 0; i < 20; i++) {
    const name = `카테고리${i + 1}`;
    const c = await pg.getRepository(Category).save({ name });
    catIds.push(c.id);
    await prisma.category.create({ data: { name } });
  }

  // ── Products 50,000개 (배치 1000개씩) ──
  const productIds: number[] = [];
  for (let batch = 0; batch < 50; batch++) {
    const pgBatch = [];
    const prismaBatch = [];
    for (let i = 0; i < 1000; i++) {
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

    if ((batch + 1) % 10 === 0) {
      console.log(`  Products: ${(batch + 1) * 1000}`);
    }
  }

  // ── Orders 100,000건 + OrderItems ~400,000건 (배치) ──
  const statuses = Object.values(OrderStatus);
  for (let batch = 0; batch < 100; batch++) {
    for (let i = 0; i < 1000; i++) {
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
      const totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
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
    if ((batch + 1) % 10 === 0) {
      console.log(`  Orders: ${(batch + 1) * 1000}`);
    }
  }

  console.log('✅ Bulk seed 완료!');
  await pg.destroy();
  await prisma.$disconnect();
}
```

- [ ] **Step 3: seed.ts 진입점**

`src/common/seed/seed.ts`:
```typescript
import { seedBasic } from './seed-basic';
import { seedBulk } from './seed-bulk';

const mode = process.argv[2] || 'basic';

async function main() {
  if (mode === 'basic') {
    await seedBasic();
  } else if (mode === 'bulk') {
    await seedBulk();
  } else {
    console.error('Usage: ts-node seed.ts [basic|bulk]');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: package.json에 시드 스크립트 추가**

```json
"seed:basic": "ts-node -r dotenv/config src/common/seed/seed.ts basic",
"seed:bulk": "ts-node -r dotenv/config src/common/seed/seed.ts bulk"
```

- [ ] **Step 5: dotenv 설치**

```bash
pnpm add dotenv
```

- [ ] **Step 6: 커밋**

```bash
git add src/common/seed/ package.json
git commit -m "feat: add seed scripts (basic + bulk) for both PG and MySQL"
```

---

### Task 10: Ch03 "주문 폭주" — TypeORM N+1 서비스

**Files:**
- Create: `src/ch03-order-crisis/typeorm/ch03-typeorm.service.ts`
- Create: `src/ch03-order-crisis/typeorm/ch03-typeorm.controller.ts`

- [ ] **Step 1: Ch03 TypeORM 서비스**

`src/ch03-order-crisis/typeorm/ch03-typeorm.service.ts`:
```typescript
// ============================================================
// 🚨 Ch03TypeormService — N+1 문제 시연 & 해결
// ============================================================
//
// 📌 N+1 문제란?
//   목록을 가져오는 쿼리 1개 + 각 항목의 상세를 가져오는 쿼리 N개
//   = 총 N+1개의 쿼리가 실행되는 비효율적 패턴
//
//   예: 주문 100건 조회 → 1(주문 목록) + 100(각 주문의 상품) = 101개 쿼리!
//
// 📌 왜 문제인가?
//   - 네트워크 왕복(RTT): DB가 원격 서버에 있으면 쿼리 하나당 ~1ms의 네트워크 비용
//   - 101개 쿼리 × 1ms = ~100ms 추가 지연 (로컬에서는 체감이 작지만 프로덕션에서는 치명적!)
//   - 일반적인 API 응답 목표: 100ms 이내
//
// 📌 해결 전략 (Phase 1→4로 점진적 개선):
//   Phase 1: N+1 발생 (나쁜 예시)
//   Phase 2: Eager Loading (relations 옵션)
//   Phase 3: JOIN (Query Builder — 가장 효율적)
//   Phase 4: 배치 페칭 (IN 절 + GROUP BY)
//
// ┌─────────────────────────────────────────────────┐
// │ Phase  │ 쿼리 수      │ 성능       │ 설명      │
// │────────│──────────────│────────────│───────────│
// │ 1 Naive│ 1 + N + N*M  │ 매우 느림  │ 루프 내 조회│
// │ 2 Eager│ 3~4개        │ 보통       │ 자동 JOIN  │
// │ 3 JOIN │ 1개          │ 가장 빠름  │ 수동 JOIN  │
// │ 4 Batch│ 2~3개        │ 빠름       │ IN절 배치  │
// └─────────────────────────────────────────────────┘
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from '../../ch02-catalog/typeorm/entities/order.entity';
import { OrderItem } from '../../ch02-catalog/typeorm/entities/order-item.entity';

@Injectable()
export class Ch03TypeormService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // Phase 1: N+1 발생 (⚠️ 나쁜 예시 — 이렇게 하면 안 됩니다!)
  // ============================================================
  // 실행되는 쿼리:
  //   1) SELECT * FROM orders LIMIT 50          (1개)
  //   2) 각 order마다: SELECT * FROM order_items WHERE orderId = ?  (N개)
  //   3) 각 item마다: SELECT * FROM products WHERE id = ?           (N*M개)
  //   → 주문 50건, 항목 평균 4개 = 1 + 50 + 200 = 251개 쿼리!
  async findOrdersNaive(): Promise<any[]> {
    const start = Date.now();
    let queryCount = 0;

    // 1️⃣ 주문 목록만 가져옴 (관계 데이터 없이)
    const orders = await this.orderRepo.find({ take: 50 });
    queryCount++;

    const result = [];
    for (const order of orders) {
      // 2️⃣ 각 주문마다 별도 쿼리로 주문 항목을 가져옴 (N+1의 "N" 부분)
      const items = await this.orderItemRepo.find({
        where: { orderId: order.id },
        relations: ['product'], // 3️⃣ 각 항목의 상품 정보도 추가 쿼리
      });
      queryCount += 1; // 실제로는 items 내 product 로딩으로 더 많은 쿼리 발생

      result.push({ ...order, orderItems: items });
    }

    return [{
      _meta: {
        phase: 'naive',
        estimatedQueries: `1 + ${orders.length} + α`,
        elapsedMs: Date.now() - start,
        warning: '⚠️ 이 방식은 프로덕션에서 절대 사용하지 마세요!',
      },
      data: result,
    }];
  }

  // ============================================================
  // Phase 2: Eager Loading — relations 옵션으로 자동 JOIN
  // ============================================================
  // TypeORM이 자동으로 LEFT JOIN 쿼리를 생성합니다.
  // 쿼리 수: 3~4개 (테이블당 1개의 SELECT + JOIN)
  async findOrdersEager(): Promise<any[]> {
    const start = Date.now();

    const orders = await this.orderRepo.find({
      take: 50,
      relations: ['orderItems', 'orderItems.product', 'user'],
      // relations: 관계 데이터를 함께 로딩해라!
      // 'orderItems.product' → 중첩 관계 (주문항목 → 상품)까지 한 번에
    });

    return [{
      _meta: {
        phase: 'eager',
        queryCount: '3~4개 (자동 JOIN)',
        elapsedMs: Date.now() - start,
      },
      data: orders,
    }];
  }

  // ============================================================
  // Phase 3: JOIN — Query Builder로 단일 쿼리 (🏆 가장 효율적)
  // ============================================================
  // 수동으로 JOIN을 작성하여 모든 데이터를 1개의 쿼리로 가져옵니다.
  //
  // 생성되는 SQL:
  //   SELECT order.*, items.*, product.*, user.*
  //   FROM orders order
  //   LEFT JOIN order_items items ON items."orderId" = order.id
  //   LEFT JOIN products product ON product.id = items."productId"
  //   LEFT JOIN users user ON user.id = order."userId"
  //   LIMIT 50
  async findOrdersJoin(): Promise<any[]> {
    const start = Date.now();

    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.user', 'user')
      .take(50)
      .getMany();

    return [{
      _meta: {
        phase: 'join',
        queryCount: '1개 (수동 JOIN)',
        elapsedMs: Date.now() - start,
        note: 'JOIN 방식은 N+1 대비 약 10배 이상 빠릅니다',
      },
      data: orders,
    }];
  }

  // ============================================================
  // Phase 4: 배치 페칭 — IN절로 묶어서 조회
  // ============================================================
  // 쿼리 수: 2~3개
  //   1) 주문 목록
  //   2) 해당 주문들의 모든 OrderItem을 IN절로 한 번에
  //   3) 해당 상품들을 IN절로 한 번에
  async findOrdersBatch(): Promise<any[]> {
    const start = Date.now();

    // 1️⃣ 주문 목록 (1개 쿼리)
    const orders = await this.orderRepo.find({ take: 50 });

    // 2️⃣ 모든 주문의 OrderItem을 한 번에 (1개 쿼리)
    const orderIds = orders.map((o) => o.id);
    const allItems = await this.orderItemRepo.find({
      where: { orderId: In(orderIds) },
      relations: ['product'],
    });

    // 3️⃣ 메모리에서 매핑 (추가 쿼리 없음)
    const itemsByOrderId = new Map<number, OrderItem[]>();
    for (const item of allItems) {
      const list = itemsByOrderId.get(item.orderId) || [];
      list.push(item);
      itemsByOrderId.set(item.orderId, list);
    }

    const result = orders.map((order) => ({
      ...order,
      orderItems: itemsByOrderId.get(order.id) || [],
    }));

    return [{
      _meta: {
        phase: 'batch',
        queryCount: '2~3개 (IN절 배치)',
        elapsedMs: Date.now() - start,
      },
      data: result,
    }];
  }
}
```

- [ ] **Step 2: Ch03 TypeORM 컨트롤러**

`src/ch03-order-crisis/typeorm/ch03-typeorm.controller.ts`:
```typescript
// 각 엔드포인트가 다른 Phase를 실행 → 응답의 _meta로 성능 비교 가능
import { Controller, Get } from '@nestjs/common';
import { Ch03TypeormService } from './ch03-typeorm.service';

@Controller('ch03/typeorm')
export class Ch03TypeormController {
  constructor(private readonly service: Ch03TypeormService) {}

  // ⚠️ N+1 발생 — 느린 버전
  @Get('orders/naive')
  findNaive() {
    return this.service.findOrdersNaive();
  }

  // ✅ Eager Loading
  @Get('orders/eager')
  findEager() {
    return this.service.findOrdersEager();
  }

  // 🏆 JOIN — 가장 빠름
  @Get('orders/join')
  findJoin() {
    return this.service.findOrdersJoin();
  }

  // ✅ 배치 페칭
  @Get('orders/batch')
  findBatch() {
    return this.service.findOrdersBatch();
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/ch03-order-crisis/typeorm/
git commit -m "feat(ch03): add N+1 problem demo — naive, eager, join, batch (TypeORM)"
```

---

### Task 11: Ch03 — Prisma N+1 서비스 & 모듈

**Files:**
- Create: `src/ch03-order-crisis/prisma/ch03-prisma.service.ts`
- Create: `src/ch03-order-crisis/prisma/ch03-prisma.controller.ts`
- Create: `src/ch03-order-crisis/ch03.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Ch03 Prisma 서비스**

`src/ch03-order-crisis/prisma/ch03-prisma.service.ts`:
```typescript
// ============================================================
// 🚨 Ch03PrismaService — Prisma에서의 N+1 문제 시연 & 해결 (MySQL)
// ============================================================
// Prisma에서 N+1이 발생하는 패턴:
//   findMany로 목록을 가져온 뒤, 루프 안에서 각 항목의 관계를 별도 조회
//
// Prisma의 해결법:
//   - include: 관계 데이터를 함께 로딩 (자동 JOIN or 추가 SELECT)
//   - select: 필요한 필드만 선택 (네트워크 전송량 감소)
//   - $queryRaw: 직접 JOIN SQL 작성 (최대 성능)
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class Ch03PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  // Phase 1: N+1 발생 (⚠️ 나쁜 예시)
  async findOrdersNaive() {
    const start = Date.now();

    // 1️⃣ 주문 목록만 (관계 없이)
    const orders = await this.prisma.order.findMany({ take: 50 });

    const result = [];
    for (const order of orders) {
      // 2️⃣ 각 주문마다 별도 쿼리 (N+1!)
      const items = await this.prisma.orderItem.findMany({
        where: { orderId: order.id },
        include: { product: true },
      });
      result.push({ ...order, orderItems: items });
    }

    return [{
      _meta: { phase: 'naive', elapsedMs: Date.now() - start },
      data: result,
    }];
  }

  // Phase 2: include로 해결
  async findOrdersInclude() {
    const start = Date.now();

    const orders = await this.prisma.order.findMany({
      take: 50,
      include: {
        user: true,
        orderItems: { include: { product: true } },
      },
    });

    return [{
      _meta: { phase: 'include', elapsedMs: Date.now() - start },
      data: orders,
    }];
  }

  // Phase 3: select로 필요한 필드만
  async findOrdersSelect() {
    const start = Date.now();

    const orders = await this.prisma.order.findMany({
      take: 50,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        orderItems: {
          select: {
            quantity: true,
            unitPrice: true,
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });

    return [{
      _meta: { phase: 'select', elapsedMs: Date.now() - start },
      data: orders,
    }];
  }

  // Phase 4: Raw JOIN (최대 성능)
  async findOrdersRawJoin() {
    const start = Date.now();

    const orders = await this.prisma.$queryRaw`
      SELECT
        o.id, o.totalAmount, o.status, o.createdAt,
        u.name AS userName,
        oi.quantity, oi.unitPrice,
        p.name AS productName
      FROM \`Order\` o
      LEFT JOIN User u ON u.id = o.userId
      LEFT JOIN OrderItem oi ON oi.orderId = o.id
      LEFT JOIN Product p ON p.id = oi.productId
      LIMIT 200
    `;

    return [{
      _meta: { phase: 'rawJoin', elapsedMs: Date.now() - start },
      data: orders,
    }];
  }
}
```

- [ ] **Step 2: Ch03 Prisma 컨트롤러**

`src/ch03-order-crisis/prisma/ch03-prisma.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { Ch03PrismaService } from './ch03-prisma.service';

@Controller('ch03/prisma')
export class Ch03PrismaController {
  constructor(private readonly service: Ch03PrismaService) {}

  @Get('orders/naive')
  findNaive() { return this.service.findOrdersNaive(); }

  @Get('orders/include')
  findInclude() { return this.service.findOrdersInclude(); }

  @Get('orders/select')
  findSelect() { return this.service.findOrdersSelect(); }

  @Get('orders/raw-join')
  findRawJoin() { return this.service.findOrdersRawJoin(); }
}
```

- [ ] **Step 3: Ch03 모듈 & AppModule 등록**

`src/ch03-order-crisis/ch03.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../ch02-catalog/typeorm/entities/order.entity';
import { OrderItem } from '../ch02-catalog/typeorm/entities/order-item.entity';
import { Ch03TypeormService } from './typeorm/ch03-typeorm.service';
import { Ch03TypeormController } from './typeorm/ch03-typeorm.controller';
import { Ch03PrismaService } from './prisma/ch03-prisma.service';
import { Ch03PrismaController } from './prisma/ch03-prisma.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [Ch03TypeormController, Ch03PrismaController],
  providers: [Ch03TypeormService, Ch03PrismaService],
})
export class Ch03Module {}
```

AppModule imports에 `Ch03Module` 추가.

- [ ] **Step 4: 커밋**

```bash
git add src/ch03-order-crisis/ src/app.module.ts
git commit -m "feat(ch03): complete N+1 crisis chapter — TypeORM(PG) + Prisma(MySQL)"
```

---

### Task 12: Ch04 "블랙프라이데이" — TypeORM 인덱스 & 최적화

**Files:**
- Create: `src/ch04-black-friday/typeorm/ch04-typeorm.service.ts`
- Create: `src/ch04-black-friday/typeorm/ch04-typeorm.controller.ts`
- Modify: `src/ch01-shop-open/typeorm/entities/product.entity.ts` (인덱스 추가)
- Modify: `src/ch02-catalog/typeorm/entities/order.entity.ts` (복합 인덱스 추가)

- [ ] **Step 1: Product 엔티티에 인덱스 추가**

`src/ch01-shop-open/typeorm/entities/product.entity.ts`에 추가:
```typescript
import { Index } from 'typeorm';

// 클래스 데코레이터로 추가:
@Index('idx_product_price', ['price'])              // Ch04: 가격 검색용 인덱스
@Index('idx_product_name_fulltext', ['name'], { fulltext: true }) // Ch04: 풀텍스트
@Entity('products')
```

`src/ch02-catalog/typeorm/entities/order.entity.ts`에 추가:
```typescript
@Index('idx_order_created_status', ['createdAt', 'status']) // Ch04: 복합 인덱스
@Entity('orders')
```

- [ ] **Step 2: Ch04 TypeORM 서비스**

`src/ch04-black-friday/typeorm/ch04-typeorm.service.ts`:
```typescript
// ============================================================
// 🔥 Ch04TypeormService — 인덱스 & 쿼리 최적화 (PostgreSQL)
// ============================================================
//
// 📌 인덱스(Index)란?
//   DB 테이블의 "색인" — 책 뒤의 색인처럼 원하는 데이터를 빠르게 찾는 자료구조
//   대부분 B-Tree 구조: 정렬된 트리로 O(log N) 시간에 검색
//
//   인덱스 없이 검색 = 전체 테이블 스캔 (Seq Scan) — 모든 행을 하나씩 확인
//   인덱스 있으면    = 인덱스 스캔 (Index Scan) — 트리 탐색으로 바로 찾음
//
// 📌 인덱스의 트레이드오프:
//   ✅ 읽기(SELECT) 속도 향상
//   ❌ 쓰기(INSERT/UPDATE/DELETE) 속도 저하 (인덱스도 함께 업데이트해야 하므로)
//   ❌ 디스크 공간 추가 사용
//   → 자주 조회하는 컬럼에만 인덱스를 걸어야 합니다!
//
// 📌 EXPLAIN ANALYZE (PostgreSQL):
//   쿼리의 "실행 계획"을 보여주는 분석 도구
//   - Seq Scan: 전체 테이블 스캔 (느림)
//   - Index Scan: 인덱스 사용 (빠름)
//   - actual time: 실제 실행 시간 (ms)
//   - rows: 스캔한 행 수
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { Order } from '../../ch02-catalog/typeorm/entities/order.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class Ch04TypeormService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ── Part 1~2: 가격 범위 검색 + EXPLAIN ANALYZE ──
  async searchByPriceRange(minPrice: number, maxPrice: number) {
    const start = Date.now();
    const products = await this.productRepo
      .createQueryBuilder('p')
      .where('p.price BETWEEN :min AND :max', { min: minPrice, max: maxPrice })
      .orderBy('p.price', 'ASC')
      .limit(20)
      .getMany();

    return {
      _meta: { elapsedMs: Date.now() - start, count: products.length },
      data: products,
    };
  }

  // EXPLAIN ANALYZE — 실행 계획 분석
  async explainPriceSearch(minPrice: number, maxPrice: number) {
    const result = await this.dataSource.query(
      `EXPLAIN ANALYZE SELECT * FROM products WHERE price BETWEEN $1 AND $2 ORDER BY price LIMIT 20`,
      [minPrice, maxPrice],
    );
    // result: [{ "QUERY PLAN": "Index Scan using idx_product_price..." }]
    return {
      note: 'Index Scan이 보이면 인덱스가 사용된 것입니다. Seq Scan이면 전체 스캔입니다.',
      plan: result,
    };
  }

  // ── 복합 필터 (날짜 + 상태) ──
  async filterOrders(from: string, to: string, status: string) {
    const start = Date.now();
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('o.status = :status', { status })
      .orderBy('o.createdAt', 'DESC')
      .limit(20)
      .getMany();

    return { _meta: { elapsedMs: Date.now() - start }, data: orders };
  }

  // ── Part 3: Query Builder 고급 — 서브쿼리 ──
  // "평균 가격 이상인 상품만 조회"
  async findAboveAveragePrice() {
    return this.productRepo
      .createQueryBuilder('p')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('AVG(p2.price)')
          .from(Product, 'p2')
          .getQuery();
        return `p.price >= ${subQuery}`;
      })
      .orderBy('p.price', 'DESC')
      .limit(20)
      .getMany();
  }

  // ── 커서 기반 페이지네이션 ──
  // OFFSET 방식의 문제: 페이지가 뒤로 갈수록 느려짐
  //   OFFSET 10000 → 앞의 10000행을 읽고 버림!
  // 커서 방식: 마지막으로 본 ID 이후부터 조회 → 항상 일정한 속도
  async findProductsByCursor(cursor: number | undefined, limit: number) {
    const qb = this.productRepo.createQueryBuilder('p');

    if (cursor) {
      qb.where('p.id > :cursor', { cursor });
    }

    const products = await qb.orderBy('p.id', 'ASC').take(limit).getMany();
    const nextCursor = products.length > 0 ? products[products.length - 1].id : null;

    return { data: products, nextCursor };
  }

  // ── Part 4: 풀텍스트 검색 (PostgreSQL) ──
  // tsvector + GIN 인덱스로 한국어/영어 키워드 검색
  async fulltextSearch(query: string) {
    return this.dataSource.query(
      `SELECT id, name, price
       FROM products
       WHERE name ILIKE $1 OR description ILIKE $1
       ORDER BY name LIMIT 20`,
      [`%${query}%`],
    );
  }

  // ── Part 5: 캐싱 ──
  async findProductsCached() {
    const cacheKey = 'ch04:products:top20';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return { _meta: { source: 'cache' }, data: cached };
    }

    const products = await this.productRepo.find({
      order: { price: 'DESC' },
      take: 20,
    });

    // TTL 60초 동안 캐시에 저장
    await this.cacheManager.set(cacheKey, products, 60000);
    return { _meta: { source: 'database' }, data: products };
  }
}
```

- [ ] **Step 3: Ch04 TypeORM 컨트롤러**

`src/ch04-black-friday/typeorm/ch04-typeorm.controller.ts`:
```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { Ch04TypeormService } from './ch04-typeorm.service';

@Controller('ch04/typeorm')
export class Ch04TypeormController {
  constructor(private readonly service: Ch04TypeormService) {}

  @Get('products/search')
  search(
    @Query('minPrice') minPrice: string,
    @Query('maxPrice') maxPrice: string,
  ) {
    return this.service.searchByPriceRange(Number(minPrice) || 0, Number(maxPrice) || 999999);
  }

  @Get('products/explain')
  explain(
    @Query('minPrice') minPrice: string,
    @Query('maxPrice') maxPrice: string,
  ) {
    return this.service.explainPriceSearch(Number(minPrice) || 0, Number(maxPrice) || 999999);
  }

  @Get('orders/filter')
  filterOrders(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('status') status: string,
  ) {
    return this.service.filterOrders(from, to, status || 'PAID');
  }

  @Get('products/above-average')
  aboveAverage() {
    return this.service.findAboveAveragePrice();
  }

  @Get('products/cursor')
  cursor(@Query('cursor') cursor: string, @Query('limit') limit: string) {
    return this.service.findProductsByCursor(
      cursor ? Number(cursor) : undefined,
      Number(limit) || 20,
    );
  }

  @Get('products/fulltext')
  fulltext(@Query('q') q: string) {
    return this.service.fulltextSearch(q || '');
  }

  @Get('products/cached')
  cached() {
    return this.service.findProductsCached();
  }
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/ch04-black-friday/typeorm/ src/ch01-shop-open/typeorm/entities/ src/ch02-catalog/typeorm/entities/
git commit -m "feat(ch04): add index optimization, EXPLAIN, fulltext, caching (TypeORM)"
```

---

### Task 13: Ch04 — Prisma 최적화 & 모듈

**Files:**
- Create: `src/ch04-black-friday/prisma/ch04-prisma.service.ts`
- Create: `src/ch04-black-friday/prisma/ch04-prisma.controller.ts`
- Create: `src/ch04-black-friday/ch04.module.ts`
- Modify: `prisma/schema.prisma` (인덱스 추가)
- Modify: `src/app.module.ts`

- [ ] **Step 1: Prisma 스키마에 인덱스 추가**

`prisma/schema.prisma`의 모델에 추가:
```prisma
model Product {
  // ... 기존 필드 ...
  @@index([price])                    // 가격 검색 인덱스
  @@fulltext([name])                  // 풀텍스트 인덱스
}

model Order {
  // ... 기존 필드 ...
  @@index([createdAt, status])        // 복합 인덱스
}
```

```bash
pnpm prisma db push
```

- [ ] **Step 2: Ch04 Prisma 서비스**

`src/ch04-black-friday/prisma/ch04-prisma.service.ts`:
```typescript
// ============================================================
// 🔥 Ch04PrismaService — 인덱스 & 쿼리 최적화 (MySQL)
// ============================================================
// MySQL과 PostgreSQL의 인덱스 차이:
//   - MySQL EXPLAIN: 실행 계획 (PostgreSQL의 EXPLAIN ANALYZE에 대응)
//   - MySQL FULLTEXT: MATCH ... AGAINST 구문 (PG의 tsvector에 대응)
//   - MySQL의 InnoDB 엔진은 기본적으로 PK에 Clustered Index 생성
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class Ch04PrismaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async searchByPriceRange(minPrice: number, maxPrice: number) {
    const start = Date.now();
    const products = await this.prisma.product.findMany({
      where: { price: { gte: minPrice, lte: maxPrice } },
      orderBy: { price: 'asc' },
      take: 20,
    });
    return { _meta: { elapsedMs: Date.now() - start }, data: products };
  }

  // MySQL EXPLAIN
  async explainPriceSearch(minPrice: number, maxPrice: number) {
    const result = await this.prisma.$queryRaw`
      EXPLAIN SELECT * FROM Product WHERE price BETWEEN ${minPrice} AND ${maxPrice} ORDER BY price LIMIT 20
    `;
    return { note: 'type=range → 인덱스 범위 스캔. type=ALL → 전체 스캔.', plan: result };
  }

  // 커서 기반 페이지네이션 (Prisma 네이티브 지원)
  async findProductsByCursor(cursor: number | undefined, limit: number) {
    const products = await this.prisma.product.findMany({
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
    const nextCursor = products.length > 0 ? products[products.length - 1].id : null;
    return { data: products, nextCursor };
  }

  // MySQL FULLTEXT 검색
  async fulltextSearch(query: string) {
    return this.prisma.$queryRaw`
      SELECT id, name, price
      FROM Product
      WHERE MATCH(name) AGAINST(${query} IN BOOLEAN MODE)
      LIMIT 20
    `;
  }

  async findProductsCached() {
    const cacheKey = 'ch04:prisma:products:top20';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return { _meta: { source: 'cache' }, data: cached };

    const products = await this.prisma.product.findMany({
      orderBy: { price: 'desc' },
      take: 20,
    });
    await this.cacheManager.set(cacheKey, products, 60000);
    return { _meta: { source: 'database' }, data: products };
  }
}
```

- [ ] **Step 3: Ch04 Prisma 컨트롤러 & 모듈**

`src/ch04-black-friday/prisma/ch04-prisma.controller.ts`:
```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { Ch04PrismaService } from './ch04-prisma.service';

@Controller('ch04/prisma')
export class Ch04PrismaController {
  constructor(private readonly service: Ch04PrismaService) {}

  @Get('products/search')
  search(@Query('minPrice') min: string, @Query('maxPrice') max: string) {
    return this.service.searchByPriceRange(Number(min) || 0, Number(max) || 999999);
  }

  @Get('products/explain')
  explain(@Query('minPrice') min: string, @Query('maxPrice') max: string) {
    return this.service.explainPriceSearch(Number(min) || 0, Number(max) || 999999);
  }

  @Get('products/cursor')
  cursor(@Query('cursor') c: string, @Query('limit') l: string) {
    return this.service.findProductsByCursor(c ? Number(c) : undefined, Number(l) || 20);
  }

  @Get('products/fulltext')
  fulltext(@Query('q') q: string) { return this.service.fulltextSearch(q || ''); }

  @Get('products/cached')
  cached() { return this.service.findProductsCached(); }
}
```

`src/ch04-black-friday/ch04.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Product } from '../ch01-shop-open/typeorm/entities/product.entity';
import { Order } from '../ch02-catalog/typeorm/entities/order.entity';
import { Ch04TypeormService } from './typeorm/ch04-typeorm.service';
import { Ch04TypeormController } from './typeorm/ch04-typeorm.controller';
import { Ch04PrismaService } from './prisma/ch04-prisma.service';
import { Ch04PrismaController } from './prisma/ch04-prisma.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order]),
    CacheModule.register({ ttl: 60000 }), // 기본 TTL 60초
  ],
  controllers: [Ch04TypeormController, Ch04PrismaController],
  providers: [Ch04TypeormService, Ch04PrismaService],
})
export class Ch04Module {}
```

캐시 매니저 설치:
```bash
pnpm add @nestjs/cache-manager cache-manager
```

AppModule imports에 `Ch04Module` 추가.

- [ ] **Step 4: 커밋**

```bash
git add src/ch04-black-friday/ prisma/schema.prisma src/app.module.ts package.json
git commit -m "feat(ch04): complete Black Friday chapter — indexes, EXPLAIN, fulltext, caching"
```

---

### Task 14: Ch05 "시스템 리뉴얼" — 마이그레이션

**Files:**
- Create: `src/ch05-system-renewal/typeorm/ch05-typeorm.service.ts`
- Create: `src/ch05-system-renewal/prisma/ch05-prisma.service.ts`
- Create: `src/ch05-system-renewal/prisma/ch05-prisma.controller.ts`
- Create: `src/ch05-system-renewal/ch05.module.ts`
- Create: `src/ch05-system-renewal/typeorm/migrations/` (TypeORM 마이그레이션 예시)
- Modify: `src/app.module.ts`

- [ ] **Step 1: TypeORM 마이그레이션 예시 파일**

`src/ch05-system-renewal/typeorm/migrations/1713600000000-AddDiscountRateToProduct.ts`:
```typescript
// ============================================================
// 🔄 마이그레이션 — Product에 discountRate 컬럼 추가
// ============================================================
// 마이그레이션이란?
//   DB 스키마(테이블 구조)를 "버전 관리"하는 방법입니다.
//   git이 코드의 변경 이력을 관리하듯, 마이그레이션은 DB 구조의 변경 이력을 관리합니다.
//
// up(): 변경을 적용 (앞으로)
// down(): 변경을 되돌림 (롤백)
//
// ⚠️ 프로덕션에서는 synchronize: true 대신 반드시 마이그레이션을 사용하세요!
//   synchronize: true의 위험성:
//   - 컬럼 이름을 변경하면 기존 컬럼을 DROP 후 새로 CREATE → 데이터 유실!
//   - 타입 변경 시 예상치 못한 데이터 변환 발생 가능
//
// 📌 마이그레이션 전략:
//   빅뱅: 한 번에 전체 변경. 다운타임 필수. 소규모 시스템에 적합.
//   트리클(점진적): 조금씩 변경. 이전/새 시스템 병행. 중규모 시스템.
//   제로 다운타임: expand-contract 패턴. 대규모 시스템.
//     1단계(expand): 새 컬럼 추가 (기존 컬럼 유지)
//     2단계: 코드에서 새 컬럼 사용 시작
//     3단계(contract): 기존 컬럼 제거
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscountRateToProduct1713600000000 implements MigrationInterface {
  // ── 적용 (앞으로) ──
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 새 컬럼 추가 (nullable로 먼저 추가 → 기존 데이터 깨지지 않음)
    await queryRunner.query(`
      ALTER TABLE products ADD COLUMN "discountRate" DECIMAL(5,2) DEFAULT 0
    `);

    // 2. 기존 데이터에 기본값 적용 (데이터 마이그레이션)
    await queryRunner.query(`
      UPDATE products SET "discountRate" = 0 WHERE "discountRate" IS NULL
    `);
  }

  // ── 롤백 (되돌리기) ──
  // 항상 롤백 계획을 먼저 세워라!
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN "discountRate"`);
  }
}
```

- [ ] **Step 2: 두 번째 마이그레이션 예시**

`src/ch05-system-renewal/typeorm/migrations/1713600001000-AddPhoneToUser.ts`:
```typescript
// User에 phone 컬럼 추가 + 기존 데이터 마이그레이션

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneToUser1713600001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN phone`);
  }
}
```

- [ ] **Step 3: Ch05 서비스 & 컨트롤러**

`src/ch05-system-renewal/typeorm/ch05-typeorm.service.ts`:
```typescript
// ============================================================
// 🔄 Ch05TypeormService — 마이그레이션 상태 조회
// ============================================================

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class Ch05TypeormService {
  constructor(private readonly dataSource: DataSource) {}

  // 실행된 마이그레이션 목록 조회
  async getMigrationStatus() {
    const migrations = await this.dataSource.query(
      `SELECT * FROM migrations ORDER BY timestamp DESC`,
    ).catch(() => []);

    return {
      note: '마이그레이션 = DB 스키마의 버전 관리. git처럼 변경 이력을 추적합니다.',
      commands: {
        generate: 'npx typeorm migration:generate -d src/data-source.ts src/ch05-system-renewal/typeorm/migrations/MigrationName',
        run: 'npx typeorm migration:run -d src/data-source.ts',
        revert: 'npx typeorm migration:revert -d src/data-source.ts',
      },
      executedMigrations: migrations,
    };
  }
}
```

`src/ch05-system-renewal/prisma/ch05-prisma.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class Ch05PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  async getMigrationStatus() {
    const migrations = await this.prisma.$queryRaw`
      SELECT * FROM _prisma_migrations ORDER BY finished_at DESC
    `.catch(() => []);

    return {
      note: 'Prisma Migrate는 schema.prisma 변경을 SQL 마이그레이션 파일로 자동 생성합니다.',
      commands: {
        dev: 'pnpm prisma migrate dev --name description',
        deploy: 'pnpm prisma migrate deploy',
        status: 'pnpm prisma migrate status',
        resolve: 'pnpm prisma migrate resolve --rolled-back migration_name',
      },
      executedMigrations: migrations,
    };
  }
}
```

`src/ch05-system-renewal/prisma/ch05-prisma.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { Ch05TypeormService } from '../typeorm/ch05-typeorm.service';
import { Ch05PrismaService } from './ch05-prisma.service';

@Controller('ch05')
export class Ch05Controller {
  constructor(
    private readonly typeormService: Ch05TypeormService,
    private readonly prismaService: Ch05PrismaService,
  ) {}

  @Get('typeorm/migration-status')
  typeormStatus() { return this.typeormService.getMigrationStatus(); }

  @Get('prisma/migration-status')
  prismaStatus() { return this.prismaService.getMigrationStatus(); }
}
```

- [ ] **Step 4: Ch05 모듈 & AppModule**

`src/ch05-system-renewal/ch05.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { Ch05TypeormService } from './typeorm/ch05-typeorm.service';
import { Ch05PrismaService } from './prisma/ch05-prisma.service';
import { Ch05Controller } from './prisma/ch05-prisma.controller';

@Module({
  controllers: [Ch05Controller],
  providers: [Ch05TypeormService, Ch05PrismaService],
})
export class Ch05Module {}
```

AppModule에 `Ch05Module` 추가.

- [ ] **Step 5: 커밋**

```bash
git add src/ch05-system-renewal/ src/app.module.ts
git commit -m "feat(ch05): add migration examples and status endpoints"
```

---

### Task 15: Ch06 "매출 분석" — TypeORM 집계 & 트랜잭션

**Files:**
- Create: `src/ch06-analytics/typeorm/ch06-typeorm.service.ts`
- Create: `src/ch06-analytics/typeorm/ch06-typeorm.controller.ts`

- [ ] **Step 1: Ch06 TypeORM 서비스**

`src/ch06-analytics/typeorm/ch06-typeorm.service.ts`:
```typescript
// ============================================================
// 📊 Ch06TypeormService — 집계, 트랜잭션, 동시성 제어, JSONB
// ============================================================
//
// 📌 트랜잭션(Transaction)이란?
//   여러 DB 작업을 "하나의 작업 단위"로 묶는 것
//   ACID 속성:
//     A(Atomicity): 전부 성공 or 전부 실패 (부분 성공 없음)
//     C(Consistency): 트랜잭션 전후로 DB가 일관된 상태 유지
//     I(Isolation): 동시 트랜잭션이 서로 간섭하지 않음
//     D(Durability): 완료된 트랜잭션은 영구 저장
//
// 📌 동시성 제어 — 두 사람이 동시에 같은 상품을 주문하면?
//   비관적 락(Pessimistic Lock): "먼저 잠근 사람만 수정 가능"
//     → SELECT ... FOR UPDATE (행을 잠금)
//     → 사용 시점: 충돌이 빈번할 때 (재고 차감)
//   낙관적 락(Optimistic Lock): "일단 수정하고, 충돌 시 재시도"
//     → @VersionColumn으로 버전 번호 체크
//     → 사용 시점: 충돌이 드물 때
//
// 📌 MVCC (Multi-Version Concurrency Control):
//   PostgreSQL: 모든 트랜잭션에서 MVCC 사용 (읽기가 쓰기를 차단하지 않음)
//   MySQL: InnoDB 엔진에서만 MVCC 지원
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../../ch02-catalog/typeorm/entities/order.entity';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { OrderItem } from '../../ch02-catalog/typeorm/entities/order-item.entity';

@Injectable()
export class Ch06TypeormService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Part 1: 월별 매출 합계 (GROUP BY + SUM) ──
  async getMonthlyRevenue() {
    return this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(o.createdAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(o.totalAmount)', 'revenue')
      .addSelect('COUNT(o.id)', 'orderCount')
      .where("o.status != 'CANCELLED'")
      .groupBy('month')
      .orderBy('month', 'DESC')
      .getRawMany();
  }

  // ── 매출 TOP 10 상품 ──
  async getTopProducts() {
    return this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('oi')
      .select('oi.productId', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('SUM(oi.quantity * oi.unitPrice)', 'totalRevenue')
      .addSelect('SUM(oi.quantity)', 'totalQuantity')
      .innerJoin('oi.product', 'p')
      .groupBy('oi.productId')
      .addGroupBy('p.name')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(10)
      .getRawMany();
  }

  // ── Part 2: 윈도우 함수 — 카테고리 내 매출 랭킹 ──
  async getCategoryRanking() {
    return this.dataSource.query(`
      SELECT
        sub.category_name,
        sub.product_name,
        sub.total_revenue,
        RANK() OVER (
          PARTITION BY sub.category_name
          ORDER BY sub.total_revenue DESC
        ) AS rank_in_category
      FROM (
        SELECT
          c.name AS category_name,
          p.name AS product_name,
          COALESCE(SUM(oi.quantity * oi."unitPrice"), 0) AS total_revenue
        FROM products p
        LEFT JOIN product_categories pc ON pc."productId" = p.id
        LEFT JOIN categories c ON c.id = pc."categoryId"
        LEFT JOIN order_items oi ON oi."productId" = p.id
        GROUP BY c.name, p.name
      ) sub
      ORDER BY sub.category_name, rank_in_category
      LIMIT 50
    `);
  }

  // ── Part 3: 트랜잭션 — 주문 결제 처리 ──
  // 재고 차감 + 주문 생성을 하나의 트랜잭션으로 묶음
  // 하나라도 실패하면 전체 롤백!
  async checkout(userId: number, items: { productId: number; quantity: number }[]) {
    return this.dataSource.transaction(async (manager) => {
      const orderItems: OrderItem[] = [];
      let totalAmount = 0;

      for (const item of items) {
        // 재고 확인
        const product = await manager.findOneOrFail(Product, {
          where: { id: item.productId },
        });

        if (product.stock < item.quantity) {
          throw new Error(`재고 부족: ${product.name} (남은 수량: ${product.stock})`);
        }

        // 재고 차감
        await manager.update(Product, item.productId, {
          stock: () => `stock - ${item.quantity}`,
        });

        const oi = new OrderItem();
        oi.productId = item.productId;
        oi.quantity = item.quantity;
        oi.unitPrice = product.price;
        orderItems.push(oi);
        totalAmount += product.price * item.quantity;
      }

      // 주문 생성
      const order = manager.create(Order, {
        userId,
        totalAmount,
        status: 'PAID' as any,
        orderItems,
      });

      return manager.save(order);
    });
  }

  // ── Part 4: 비관적 락 — 동시 재고 차감 방지 ──
  async checkoutWithLock(userId: number, productId: number, quantity: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // FOR UPDATE → 이 행을 다른 트랜잭션이 읽을 수 없게 잠금
      const product = await queryRunner.manager
        .createQueryBuilder(Product, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id: productId })
        .getOneOrFail();

      if (product.stock < quantity) {
        throw new Error(`재고 부족: ${product.name}`);
      }

      await queryRunner.manager.update(Product, productId, {
        stock: product.stock - quantity,
      });

      const order = queryRunner.manager.create(Order, {
        userId,
        totalAmount: product.price * quantity,
        status: 'PAID' as any,
        orderItems: [
          Object.assign(new OrderItem(), {
            productId,
            quantity,
            unitPrice: product.price,
          }),
        ],
      });

      const saved = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Part 5: 저장 프로시저 (PG 함수) ──
  async callMonthlyRevenueFunction(year: number, month: number) {
    // 먼저 함수 생성 (존재하지 않는 경우)
    await this.dataSource.query(`
      CREATE OR REPLACE FUNCTION calculate_monthly_revenue(p_year INT, p_month INT)
      RETURNS TABLE(total_revenue NUMERIC, order_count BIGINT) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          COALESCE(SUM(o."totalAmount"), 0) AS total_revenue,
          COUNT(o.id) AS order_count
        FROM orders o
        WHERE EXTRACT(YEAR FROM o."createdAt") = p_year
          AND EXTRACT(MONTH FROM o."createdAt") = p_month
          AND o.status != 'CANCELLED';
      END;
      $$ LANGUAGE plpgsql;
    `);

    return this.dataSource.query(
      `SELECT * FROM calculate_monthly_revenue($1, $2)`,
      [year, month],
    );
  }

  // ── Part 6: JSONB 검색 (PostgreSQL 전용) ──
  async searchByMetadata(key: string, value: string) {
    return this.dataSource.query(
      `SELECT id, name, price, metadata
       FROM products
       WHERE metadata ->> $1 = $2
       LIMIT 20`,
      [key, value],
    );
  }
}
```

- [ ] **Step 2: Ch06 TypeORM 컨트롤러**

`src/ch06-analytics/typeorm/ch06-typeorm.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Ch06TypeormService } from './ch06-typeorm.service';

@Controller('ch06/typeorm')
export class Ch06TypeormController {
  constructor(private readonly service: Ch06TypeormService) {}

  @Get('analytics/monthly-revenue')
  monthlyRevenue() { return this.service.getMonthlyRevenue(); }

  @Get('analytics/top-products')
  topProducts() { return this.service.getTopProducts(); }

  @Get('analytics/category-ranking')
  categoryRanking() { return this.service.getCategoryRanking(); }

  @Post('orders/checkout')
  checkout(@Body() body: { userId: number; items: { productId: number; quantity: number }[] }) {
    return this.service.checkout(body.userId, body.items);
  }

  @Post('orders/concurrent-checkout')
  concurrentCheckout(
    @Body() body: { userId: number; productId: number; quantity: number },
  ) {
    return this.service.checkoutWithLock(body.userId, body.productId, body.quantity);
  }

  @Get('analytics/monthly-function')
  monthlyFunction(@Query('year') year: string, @Query('month') month: string) {
    return this.service.callMonthlyRevenueFunction(Number(year), Number(month));
  }

  @Get('products/by-metadata')
  byMetadata(@Query('key') key: string, @Query('value') value: string) {
    return this.service.searchByMetadata(key, value);
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/ch06-analytics/typeorm/
git commit -m "feat(ch06): add analytics, transactions, locking, stored proc, JSONB (TypeORM)"
```

---

### Task 16: Ch06 — Prisma 분석 & 모듈

**Files:**
- Create: `src/ch06-analytics/prisma/ch06-prisma.service.ts`
- Create: `src/ch06-analytics/prisma/ch06-prisma.controller.ts`
- Create: `src/ch06-analytics/ch06.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Ch06 Prisma 서비스**

`src/ch06-analytics/prisma/ch06-prisma.service.ts`:
```typescript
// ============================================================
// 📊 Ch06PrismaService — 집계, 트랜잭션, 동시성 제어, JSON (MySQL)
// ============================================================
// MySQL과 PostgreSQL의 차이:
//   - MySQL JSON vs PG JSONB:
//     PG JSONB: 바이너리 저장, GIN 인덱스 가능, 연산자(->>, @>) 풍부
//     MySQL JSON: 텍스트 기반, JSON_EXTRACT/JSON_CONTAINS 함수 사용
//   - 저장 프로시저: PG는 FUNCTION, MySQL은 PROCEDURE 키워드
//   - MVCC: MySQL은 InnoDB에서만 지원 (MyISAM은 테이블 락)
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class Ch06PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  // 월별 매출
  async getMonthlyRevenue() {
    return this.prisma.$queryRaw`
      SELECT
        DATE_FORMAT(createdAt, '%Y-%m') AS month,
        SUM(totalAmount) AS revenue,
        COUNT(id) AS orderCount
      FROM \`Order\`
      WHERE status != 'CANCELLED'
      GROUP BY month
      ORDER BY month DESC
    `;
  }

  // 매출 TOP 10
  async getTopProducts() {
    return this.prisma.$queryRaw`
      SELECT
        oi.productId,
        p.name AS productName,
        SUM(oi.quantity * oi.unitPrice) AS totalRevenue,
        SUM(oi.quantity) AS totalQuantity
      FROM OrderItem oi
      INNER JOIN Product p ON p.id = oi.productId
      GROUP BY oi.productId, p.name
      ORDER BY totalRevenue DESC
      LIMIT 10
    `;
  }

  // 윈도우 함수 (MySQL 8+)
  async getCategoryRanking() {
    return this.prisma.$queryRaw`
      SELECT sub.*, RANK() OVER (
        PARTITION BY sub.categoryName ORDER BY sub.totalRevenue DESC
      ) AS rankInCategory
      FROM (
        SELECT c.name AS categoryName, p.name AS productName,
          COALESCE(SUM(oi.quantity * oi.unitPrice), 0) AS totalRevenue
        FROM Product p
        LEFT JOIN ProductCategory pc ON pc.productId = p.id
        LEFT JOIN Category c ON c.id = pc.categoryId
        LEFT JOIN OrderItem oi ON oi.productId = p.id
        GROUP BY c.name, p.name
      ) sub
      ORDER BY sub.categoryName, rankInCategory
      LIMIT 50
    `;
  }

  // 인터랙티브 트랜잭션
  async checkout(userId: number, items: { productId: number; quantity: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItems: { productId: number; quantity: number; unitPrice: number }[] = [];

      for (const item of items) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        });

        if (product.stock < item.quantity) {
          throw new Error(`재고 부족: ${product.name}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(product.price),
        });
        totalAmount += Number(product.price) * item.quantity;
      }

      return tx.order.create({
        data: {
          userId,
          totalAmount,
          status: 'PAID',
          orderItems: { create: orderItems },
        },
        include: { orderItems: true },
      });
    });
  }

  // 비관적 락 (FOR UPDATE)
  async checkoutWithLock(userId: number, productId: number, quantity: number) {
    return this.prisma.$transaction(async (tx) => {
      const [product] = await tx.$queryRaw<any[]>`
        SELECT * FROM Product WHERE id = ${productId} FOR UPDATE
      `;

      if (!product || product.stock < quantity) {
        throw new Error('재고 부족');
      }

      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      return tx.order.create({
        data: {
          userId,
          totalAmount: Number(product.price) * quantity,
          status: 'PAID',
          orderItems: {
            create: [{ productId, quantity, unitPrice: Number(product.price) }],
          },
        },
      });
    });
  }

  // MySQL 저장 프로시저
  async callMonthlyRevenueProc(year: number, month: number) {
    await this.prisma.$executeRaw`
      CREATE PROCEDURE IF NOT EXISTS calculate_monthly_revenue(IN p_year INT, IN p_month INT)
      BEGIN
        SELECT
          COALESCE(SUM(totalAmount), 0) AS total_revenue,
          COUNT(id) AS order_count
        FROM \`Order\`
        WHERE YEAR(createdAt) = p_year AND MONTH(createdAt) = p_month
          AND status != 'CANCELLED';
      END
    `.catch(() => {/* 이미 존재하면 무시 */});

    return this.prisma.$queryRaw`CALL calculate_monthly_revenue(${year}, ${month})`;
  }

  // MySQL JSON 검색
  async searchByMetadata(key: string, value: string) {
    return this.prisma.$queryRaw`
      SELECT id, name, price, metadata
      FROM Product
      WHERE JSON_EXTRACT(metadata, ${`$.${key}`}) = ${value}
      LIMIT 20
    `;
  }
}
```

- [ ] **Step 2: Ch06 Prisma 컨트롤러**

`src/ch06-analytics/prisma/ch06-prisma.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Ch06PrismaService } from './ch06-prisma.service';

@Controller('ch06/prisma')
export class Ch06PrismaController {
  constructor(private readonly service: Ch06PrismaService) {}

  @Get('analytics/monthly-revenue')
  monthlyRevenue() { return this.service.getMonthlyRevenue(); }

  @Get('analytics/top-products')
  topProducts() { return this.service.getTopProducts(); }

  @Get('analytics/category-ranking')
  categoryRanking() { return this.service.getCategoryRanking(); }

  @Post('orders/checkout')
  checkout(@Body() body: { userId: number; items: { productId: number; quantity: number }[] }) {
    return this.service.checkout(body.userId, body.items);
  }

  @Post('orders/concurrent-checkout')
  concurrentCheckout(@Body() body: { userId: number; productId: number; quantity: number }) {
    return this.service.checkoutWithLock(body.userId, body.productId, body.quantity);
  }

  @Get('analytics/monthly-proc')
  monthlyProc(@Query('year') y: string, @Query('month') m: string) {
    return this.service.callMonthlyRevenueProc(Number(y), Number(m));
  }

  @Get('products/by-metadata')
  byMetadata(@Query('key') key: string, @Query('value') value: string) {
    return this.service.searchByMetadata(key, value);
  }
}
```

- [ ] **Step 3: Ch06 모듈 & AppModule**

`src/ch06-analytics/ch06.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../ch02-catalog/typeorm/entities/order.entity';
import { OrderItem } from '../ch02-catalog/typeorm/entities/order-item.entity';
import { Product } from '../ch01-shop-open/typeorm/entities/product.entity';
import { Ch06TypeormService } from './typeorm/ch06-typeorm.service';
import { Ch06TypeormController } from './typeorm/ch06-typeorm.controller';
import { Ch06PrismaService } from './prisma/ch06-prisma.service';
import { Ch06PrismaController } from './prisma/ch06-prisma.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product])],
  controllers: [Ch06TypeormController, Ch06PrismaController],
  providers: [Ch06TypeormService, Ch06PrismaService],
})
export class Ch06Module {}
```

AppModule에 `Ch06Module` 추가.

- [ ] **Step 4: 최종 빌드 확인**

```bash
pnpm build
```

- [ ] **Step 5: 커밋**

```bash
git add src/ch06-analytics/ src/app.module.ts
git commit -m "feat(ch06): complete Analytics chapter — aggregation, transactions, locking, JSON"
```

---

### Task 17: 최종 검증 & README

**Files:**
- Create: `README.md`
- Modify: `src/app.module.ts` (모든 모듈 등록 확인)

- [ ] **Step 1: app.module.ts 최종 확인**

모든 챕터 모듈이 imports 배열에 포함되어 있는지 확인:
```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  TypeOrmModule.forRootAsync({ ... }),
  PrismaModule,
  Ch01Module,
  Ch02Module,
  Ch03Module,
  Ch04Module,
  Ch05Module,
  Ch06Module,
],
```

- [ ] **Step 2: README.md 작성**

```markdown
# DB with NestJS — 시나리오 기반 RDB 학습 프로젝트

TypeORM(PostgreSQL) + Prisma(MySQL) 두 가지 ORM을 이커머스 도메인으로 비교 학습합니다.

## 시작하기

\`\`\`bash
docker compose up -d       # DB 시작
pnpm install               # 의존성 설치
pnpm prisma generate       # Prisma 클라이언트 생성
pnpm prisma db push        # MySQL 스키마 반영
pnpm start:dev             # 앱 실행 (http://localhost:3000)
\`\`\`

## 시드 데이터

\`\`\`bash
pnpm seed:basic            # 소량 데이터 (Ch01~02)
pnpm seed:bulk             # 대량 데이터 (Ch03~06 성능 체감)
\`\`\`

## 챕터 구성

| # | 시나리오 | 핵심 학습 | 엔드포인트 접두사 |
|---|---------|----------|----------------|
| 1 | 쇼핑몰 오픈 | DB 연결, 엔티티, PK | /ch01 |
| 2 | 카탈로그 구축 | 관계, CRUD, QB, 뷰 | /ch02 |
| 3 | 주문 폭주 | N+1 문제 & 해결 | /ch03 |
| 4 | 블랙프라이데이 | 인덱스, EXPLAIN, 캐싱 | /ch04 |
| 5 | 시스템 리뉴얼 | 마이그레이션 전략 | /ch05 |
| 6 | 매출 분석 | 집계, 트랜잭션, 락, JSONB | /ch06 |

각 챕터의 TypeORM 버전은 `/chXX/typeorm/...`, Prisma 버전은 `/chXX/prisma/...` 경로입니다.
```

- [ ] **Step 3: 전체 빌드 & 실행 확인**

```bash
pnpm build
docker compose up -d
pnpm start:dev
# 각 챕터 엔드포인트 테스트
curl http://localhost:3000/ch01/typeorm/users
curl http://localhost:3000/ch01/prisma/users
```

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "docs: add README and finalize all chapter modules"
```
