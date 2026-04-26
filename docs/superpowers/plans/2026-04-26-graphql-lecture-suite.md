# GraphQL Lecture Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NestJS 모노레포 위에 6챕터(REST→GraphQL→Federation) 시나리오 기반 GraphQL 학습 프로젝트를 in-memory mock 데이터로 구축한다.

**Architecture:** `apps/lecture`(Ch01–Ch05)와 Ch06용 `apps/{users-subgraph,orders-subgraph,gateway}` 4개 NestJS 앱이 `libs/mock-data` 공통 라이브러리를 공유한다. Code-First GraphQL, AsyncLocalStorage 기반 호출 카운터로 N+1 효과를 가시화하며, Apollo Federation v2로 분산 도메인 통합을 시연한다.

**Tech Stack:** NestJS 11, `@nestjs/graphql` + `@nestjs/apollo` (Code-First), `@apollo/server` v4, `dataloader`, `graphql-ws` (Subscription), `@apollo/subgraph` + `@apollo/gateway` (Federation), `@faker-js/faker`, pnpm.

---

## File Map

```
db-with-nestjs/
├── package.json                                    # MODIFY: deps 교체
├── nest-cli.json                                   # MODIFY: monorepo 모드
├── tsconfig.json                                   # MODIFY: paths 추가
├── tsconfig.build.json                             # KEEP
├── eslint.config.mjs                               # KEEP
│
├── libs/mock-data/                                 # CREATE
│   ├── tsconfig.lib.json
│   └── src/
│       ├── index.ts
│       ├── domain.ts                               # User/Product/Order 등 타입
│       ├── store.ts                                # in-memory 싱글톤
│       ├── seed.ts                                 # faker로 시드 생성
│       ├── call-counter.ts                         # AsyncLocalStorage 카운터
│       └── mock-repository.ts                      # CRUD + latency
│
├── apps/lecture/                                   # CREATE
│   ├── tsconfig.app.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts                           # 챕터 import 토글
│       ├── common/
│       │   ├── call-counter.interceptor.ts
│       │   └── apollo-call-counter.plugin.ts
│       ├── ch01-rest-pain/
│       │   ├── ch01.module.ts
│       │   ├── web-bff.controller.ts
│       │   ├── mobile-bff.controller.ts
│       │   ├── admin-bff.controller.ts
│       │   └── README.md
│       ├── ch02-graphql-basics/
│       │   ├── ch02.module.ts
│       │   ├── models/{user,product,order,order-item,review,category}.model.ts
│       │   ├── resolvers/{user,product,order}.resolver.ts
│       │   └── README.md
│       ├── ch03-data-graph/
│       │   ├── ch03.module.ts
│       │   ├── models/{user,product,order,order-item,review,category}.model.ts
│       │   ├── resolvers/{user,product,order}.resolver.ts
│       │   └── README.md
│       ├── ch04-n-plus-one/
│       │   ├── ch04.module.ts
│       │   ├── loaders/{user,product}.loader.ts
│       │   ├── models/...                          # Ch03와 동일 구조
│       │   ├── resolvers/...
│       │   └── README.md
│       └── ch05-client-operations/
│           ├── ch05.module.ts
│           ├── models/...
│           ├── resolvers/order.resolver.ts         # @Subscription 추가
│           ├── pubsub.provider.ts
│           └── README.md
│
├── apps/users-subgraph/                            # CREATE (Ch06)
│   ├── tsconfig.app.json
│   └── src/{main.ts, app.module.ts, user.{model,resolver}.ts}
│
├── apps/orders-subgraph/                           # CREATE (Ch06)
│   ├── tsconfig.app.json
│   └── src/{main.ts, app.module.ts, order.{model,resolver}.ts, product.{model,resolver}.ts, user-ref.model.ts}
│
├── apps/gateway/                                   # CREATE (Ch06)
│   ├── tsconfig.app.json
│   └── src/{main.ts, app.module.ts}
│
├── operations/                                     # CREATE (Ch05 데모용)
│   ├── ch02-storefront.graphql
│   ├── ch03-order-detail.graphql
│   ├── ch04-list-orders.graphql
│   └── ch05/
│       ├── good-getProduct.graphql
│       ├── anti-overfetch.graphql
│       ├── fragment-userCard.graphql
│       ├── conditional-admin.graphql
│       └── subscribe-orderStatus.graphql
│
├── docs/superpowers/specs/2026-04-26-graphql-lecture-suite-design.md   # 보존
├── docs/superpowers/plans/2026-04-26-graphql-lecture-suite.md          # 본 파일
│
└── DELETE:
    ├── src/ch01-shop-open/ ~ src/ch06-analytics/
    ├── src/common/prisma/, src/common/seed/
    ├── src/app.module.ts, src/main.ts (apps/lecture로 이동)
    ├── prisma/, prisma.config.ts
    ├── docker-compose.yml
    └── (devDep) prisma, (dep) @prisma/client, @prisma/adapter-mariadb,
        mariadb, mysql2, pg, typeorm, @nestjs/typeorm,
        @nestjs/cache-manager, cache-manager
```

---

## Task 1: 브랜치 + 의존성 정리

**Files:**
- Modify: `package.json`
- Delete: `src/ch01-shop-open/` ~ `src/ch06-analytics/`, `src/common/`, `src/app.module.ts`, `src/main.ts`, `src/app.controller.ts`(있다면), `src/app.service.ts`(있다면), `prisma/`, `prisma.config.ts`, `docker-compose.yml`

- [ ] **Step 1.1: 새 브랜치 생성**

```bash
git checkout -b feat/graphql-lecture-suite
git status
```

Expected: `On branch feat/graphql-lecture-suite`, working tree clean.

- [ ] **Step 1.2: DB 학습 코드 삭제**

```bash
rm -rf src/ch01-shop-open src/ch02-catalog src/ch03-order-crisis \
       src/ch04-black-friday src/ch05-system-renewal src/ch06-analytics \
       src/common src/app.module.ts src/main.ts \
       prisma prisma.config.ts docker-compose.yml
```

확인: `ls src/`는 비어있거나 존재하지 않음(다음 태스크에서 `src/` 자체 삭제 예정).

- [ ] **Step 1.3: package.json 업데이트**

`package.json` 전체 교체:

```json
{
  "name": "graphql-with-nestjs",
  "version": "0.0.1",
  "description": "GraphQL lecture suite — scenario-based learning over NestJS monorepo",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "build:lecture": "nest build lecture",
    "build:users-subgraph": "nest build users-subgraph",
    "build:orders-subgraph": "nest build orders-subgraph",
    "build:gateway": "nest build gateway",
    "format": "prettier --write \"apps/**/*.ts\" \"libs/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start lecture",
    "start:dev": "nest start lecture --watch",
    "start:users": "nest start users-subgraph --watch",
    "start:orders": "nest start orders-subgraph --watch",
    "start:gateway": "nest start gateway --watch",
    "lint": "eslint \"{apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@apollo/gateway": "^2.9.3",
    "@apollo/server": "^4.11.2",
    "@apollo/subgraph": "^2.9.3",
    "@faker-js/faker": "^10.4.0",
    "@nestjs/apollo": "^13.0.3",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.0.1",
    "@nestjs/graphql": "^13.0.3",
    "@nestjs/platform-express": "^11.0.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "dataloader": "^2.2.3",
    "graphql": "^16.9.0",
    "graphql-subscriptions": "^3.0.0",
    "graphql-ws": "^5.16.2",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "@types/supertest": "^7.0.0",
    "@types/ws": "^8.5.13",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
    "globals": "^17.0.0",
    "jest": "^30.0.0",
    "prettier": "^3.4.2",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": ".",
    "roots": ["<rootDir>/apps/", "<rootDir>/libs/"],
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "./coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@app/mock-data(|/.*)$": "<rootDir>/libs/mock-data/src/$1"
    }
  }
}
```

- [ ] **Step 1.4: 의존성 재설치**

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

Expected: `Done in Xs` 메시지, lock 파일 재생성, `node_modules` 안에 `@nestjs/apollo`, `@apollo/gateway` 등 존재.

확인: `ls node_modules/@nestjs/graphql node_modules/@apollo/gateway node_modules/dataloader`

- [ ] **Step 1.5: 커밋**

```bash
git add -A
git commit -m "chore: reset for GraphQL lecture suite — drop DB deps, keep specs"
```

---

## Task 2: NestJS 모노레포 설정

**Files:**
- Create: `apps/lecture/tsconfig.app.json`
- Modify: `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`

- [ ] **Step 2.1: `nest-cli.json` 전체 교체**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/lecture/src",
  "compilerOptions": {
    "deleteOutDir": true,
    "webpack": false,
    "tsConfigPath": "apps/lecture/tsconfig.app.json"
  },
  "monorepo": true,
  "root": "apps/lecture",
  "projects": {
    "lecture": {
      "type": "application",
      "root": "apps/lecture",
      "entryFile": "main",
      "sourceRoot": "apps/lecture/src",
      "compilerOptions": {
        "tsConfigPath": "apps/lecture/tsconfig.app.json"
      }
    },
    "users-subgraph": {
      "type": "application",
      "root": "apps/users-subgraph",
      "entryFile": "main",
      "sourceRoot": "apps/users-subgraph/src",
      "compilerOptions": {
        "tsConfigPath": "apps/users-subgraph/tsconfig.app.json"
      }
    },
    "orders-subgraph": {
      "type": "application",
      "root": "apps/orders-subgraph",
      "entryFile": "main",
      "sourceRoot": "apps/orders-subgraph/src",
      "compilerOptions": {
        "tsConfigPath": "apps/orders-subgraph/tsconfig.app.json"
      }
    },
    "gateway": {
      "type": "application",
      "root": "apps/gateway",
      "entryFile": "main",
      "sourceRoot": "apps/gateway/src",
      "compilerOptions": {
        "tsConfigPath": "apps/gateway/tsconfig.app.json"
      }
    },
    "mock-data": {
      "type": "library",
      "root": "libs/mock-data",
      "entryFile": "index",
      "sourceRoot": "libs/mock-data/src",
      "compilerOptions": {
        "tsConfigPath": "libs/mock-data/tsconfig.lib.json"
      }
    }
  }
}
```

- [ ] **Step 2.2: `tsconfig.json`에 path mapping 추가**

기존 `tsconfig.json`의 `compilerOptions`에 `paths`와 `module/moduleResolution` 변경. **전체 교체**:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@app/mock-data": ["libs/mock-data/src"],
      "@app/mock-data/*": ["libs/mock-data/src/*"]
    }
  }
}
```

> 주의: NestJS 모노레포 + Apollo는 `module: commonjs`가 안정적이라 `nodenext`에서 변경.

- [ ] **Step 2.3: `apps/lecture/tsconfig.app.json` 생성**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/apps/lecture",
    "types": ["node"]
  },
  "include": ["src/**/*", "../../libs/**/*"],
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 2.4: `tsconfig.build.json` 확인/수정**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 2.5: 커밋 (코드 없는 설정만)**

```bash
git add nest-cli.json tsconfig.json tsconfig.build.json apps/lecture/tsconfig.app.json
git commit -m "chore: convert to NestJS monorepo (apps/lecture + libs)"
```

---

## Task 3: libs/mock-data 라이브러리

**Files:**
- Create: `libs/mock-data/tsconfig.lib.json`
- Create: `libs/mock-data/src/index.ts`
- Create: `libs/mock-data/src/domain.ts`
- Create: `libs/mock-data/src/store.ts`
- Create: `libs/mock-data/src/seed.ts`
- Create: `libs/mock-data/src/call-counter.ts`
- Create: `libs/mock-data/src/mock-repository.ts`

- [ ] **Step 3.1: `libs/mock-data/tsconfig.lib.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "outDir": "../../dist/libs/mock-data"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 3.2: `libs/mock-data/src/domain.ts`**

```typescript
// 인메모리 도메인 타입 — GraphQL ObjectType과 분리된 순수 TS 인터페이스
// 챕터별 GraphQL 모델은 이 인터페이스를 매핑/래핑하는 형태로 작성한다.

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  description: string;
  createdAt: Date;
}

export interface Category {
  id: number;
  name: string;
}

export interface ProductCategory {
  productId: number;
  categoryId: number;
}

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface Review {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  content: string;
  createdAt: Date;
}

export interface Store {
  users: User[];
  products: Product[];
  categories: Category[];
  productCategories: ProductCategory[];
  orders: Order[];
  orderItems: OrderItem[];
  reviews: Review[];
}
```

- [ ] **Step 3.3: `libs/mock-data/src/store.ts`**

```typescript
import { Store } from './domain';
import { createSeed } from './seed';

let _store: Store | null = null;

// 앱 부팅 시 1회 호출 — 프로세스 메모리에만 보관, 재시작 시 초기화.
export function initStore(size: 'basic' | 'medium' = 'basic'): Store {
  _store = createSeed(size);
  return _store;
}

export function getStore(): Store {
  if (!_store) {
    _store = createSeed('basic');
  }
  return _store;
}
```

- [ ] **Step 3.4: `libs/mock-data/src/seed.ts`**

```typescript
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

// faker.seed로 결정론적 데이터 — 학습자가 매번 같은 결과를 봄
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
    createdAt: faker.date.past(),
  }));

  const categories: Category[] = ['전자기기', '의류', '식품', '도서', '스포츠'].map((name, i) => ({
    id: i + 1,
    name,
  }));

  const products: Product[] = Array.from({ length: counts.products }, (_, i) => ({
    id: i + 1,
    name: faker.commerce.productName(),
    price: Number(faker.commerce.price({ min: 1000, max: 500000, dec: 0 })),
    stock: faker.number.int({ min: 0, max: 100 }),
    description: faker.commerce.productDescription(),
    createdAt: faker.date.past(),
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
    totalAmount: 0, // 아래에서 OrderItem 합계로 채움
    createdAt: faker.date.past(),
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
        unitPrice: product.price,
      };
    });
  });

  // Order.totalAmount 계산
  for (const order of orders) {
    const items = orderItems.filter((it) => it.orderId === order.id);
    order.totalAmount = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  }

  const reviews: Review[] = Array.from({ length: counts.reviewsTarget }, (_, i) => ({
    id: i + 1,
    userId: faker.helpers.arrayElement(users).id,
    productId: faker.helpers.arrayElement(products).id,
    rating: faker.number.int({ min: 1, max: 5 }),
    content: faker.lorem.sentence(),
    createdAt: faker.date.past(),
  }));

  return { users, products, categories, productCategories, orders, orderItems, reviews };
}
```

- [ ] **Step 3.5: `libs/mock-data/src/call-counter.ts`**

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

// 요청별 호출 카운터.
// AsyncLocalStorage로 NestJS 인터셉터에서 시작한 컨텍스트가 리졸버 → 리포지토리까지 전파됨.
const storage = new AsyncLocalStorage<CallCounter>();

export class CallCounter {
  private counts: Record<string, number> = {};

  // 인터셉터/플러그인이 새 요청 진입 시 호출
  static run<T>(fn: () => T): T {
    return storage.run(new CallCounter(), fn);
  }

  static current(): CallCounter | undefined {
    return storage.getStore();
  }

  increment(entityName: string): void {
    this.counts[entityName] = (this.counts[entityName] ?? 0) + 1;
  }

  total(): number {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }

  toHeader(): string {
    const parts = Object.entries(this.counts).map(([k, v]) => `${k}=${v}`);
    parts.push(`total=${this.total()}`);
    return parts.join(', ');
  }
}
```

- [ ] **Step 3.6: `libs/mock-data/src/mock-repository.ts`**

```typescript
import { CallCounter } from './call-counter';

const LATENCY_MS = 5; // 의도적 "DB" 지연 — N+1 효과를 시간으로도 체감

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class MockRepository<T extends { id: number }> {
  constructor(
    private readonly entityName: string,
    private readonly getAll: () => T[],
  ) {}

  // 단건 조회 — 호출 1회로 카운팅
  async findOne(id: number): Promise<T | undefined> {
    CallCounter.current()?.increment(this.entityName);
    await sleep(LATENCY_MS);
    return this.getAll().find((e) => e.id === id);
  }

  // 다건 조회 (필터) — 1회로 카운팅
  async findMany(filter?: (e: T) => boolean): Promise<T[]> {
    CallCounter.current()?.increment(this.entityName);
    await sleep(LATENCY_MS);
    const all = this.getAll();
    return filter ? all.filter(filter) : [...all];
  }

  // ID 배열 조회 — DataLoader가 사용. 1회로 카운팅.
  async findByIds(ids: readonly number[]): Promise<(T | undefined)[]> {
    CallCounter.current()?.increment(this.entityName);
    await sleep(LATENCY_MS);
    const map = new Map<number, T>();
    for (const e of this.getAll()) map.set(e.id, e);
    return ids.map((id) => map.get(id));
  }
}
```

- [ ] **Step 3.7: `libs/mock-data/src/index.ts`**

```typescript
export * from './domain';
export * from './store';
export * from './seed';
export * from './call-counter';
export * from './mock-repository';
```

- [ ] **Step 3.8: 빌드 확인**

```bash
pnpm exec tsc --noEmit -p libs/mock-data/tsconfig.lib.json
```

Expected: 출력 없음(에러 0). 출력이 있으면 해당 파일 수정 후 재실행.

- [ ] **Step 3.9: 커밋**

```bash
git add libs/
git commit -m "feat(mock-data): add in-memory store, faker seed, call counter, repository"
```

---

## Task 4: App 스켈레톤 + CallCounter 인터셉터/플러그인

**Files:**
- Create: `apps/lecture/src/main.ts`
- Create: `apps/lecture/src/app.module.ts`
- Create: `apps/lecture/src/common/call-counter.interceptor.ts`
- Create: `apps/lecture/src/common/apollo-call-counter.plugin.ts`

- [ ] **Step 4.1: `apps/lecture/src/common/call-counter.interceptor.ts`**

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CallCounter } from '@app/mock-data';

// 모든 HTTP 요청에 대해 CallCounter 컨텍스트를 시작.
// REST(Ch01) 응답에 x-mock-db-calls 헤더를 부착한다.
// GraphQL(Ch02~)은 ApolloCallCounterPlugin이 같은 역할 수행.
@Injectable()
export class CallCounterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<{
      setHeader?: (name: string, value: string) => void;
    } | null>();

    return new Observable((subscriber) => {
      CallCounter.run(() => {
        const subscription = next.handle().subscribe({
          next: (value) => {
            const counter = CallCounter.current();
            if (counter && response?.setHeader) {
              response.setHeader('x-mock-db-calls', counter.toHeader());
            }
            subscriber.next(value);
          },
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
        return () => subscription.unsubscribe();
      });
    });
  }
}
```

- [ ] **Step 4.2: `apps/lecture/src/common/apollo-call-counter.plugin.ts`**

```typescript
import { Plugin } from '@nestjs/apollo';
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from '@apollo/server';
import { CallCounter } from '@app/mock-data';

// Apollo Server 플러그인 — GraphQL 요청 단위로 CallCounter 컨텍스트를 시작/종료하고
// 응답 HTTP 헤더 x-mock-db-calls에 결과를 노출한다.
@Plugin()
export class ApolloCallCounterPlugin implements ApolloServerPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener<object>> {
    // 진입 시 새 카운터 시작 — `enterWith` 패턴으로 비동기 체인 전체에 전파
    const { AsyncLocalStorage } = await import('node:async_hooks');
    void AsyncLocalStorage; // ensure import side-effect for ts
    const counter = new CallCounter();
    // CallCounter.run으로 감싸지 못하므로 직접 storage에 진입
    // (CallCounter 모듈은 enterWith를 노출하지 않으므로 willSendResponse 시 store에서 읽는다)
    return {
      async willSendResponse(ctx) {
        const current = CallCounter.current();
        const used = current ?? counter;
        ctx.response.http?.headers.set('x-mock-db-calls', used.toHeader());
      },
    };
  }
}
```

> 주의: 위 플러그인은 인터셉터가 먼저 `CallCounter.run` 컨텍스트를 만들어 두는 것을 전제로 한다. NestJS는 GraphQL 요청도 HTTP 요청 → `APP_INTERCEPTOR` 체인을 거치므로 인터셉터의 `CallCounter.run` 안에서 리졸버가 실행된다.

- [ ] **Step 4.3: `apps/lecture/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CallCounterInterceptor } from './common/call-counter.interceptor';

// 학습 중인 챕터 모듈 하나만 활성화한다.
// 다른 챕터로 이동할 때는 import 배열에서 교체.
import { Ch01RestModule } from './ch01-rest-pain/ch01.module';
// import { Ch02GraphQLModule } from './ch02-graphql-basics/ch02.module';
// import { Ch03DataGraphModule } from './ch03-data-graph/ch03.module';
// import { Ch04DataLoaderModule } from './ch04-n-plus-one/ch04.module';
// import { Ch05SubscriptionModule } from './ch05-client-operations/ch05.module';

@Module({
  imports: [
    Ch01RestModule,
    // Ch02GraphQLModule,
    // Ch03DataGraphModule,
    // Ch04DataLoaderModule,
    // Ch05SubscriptionModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CallCounterInterceptor,
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 4.4: `apps/lecture/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initStore } from '@app/mock-data';

async function bootstrap(): Promise<void> {
  // 인메모리 스토어 초기화 — 앱 부팅 시 1회
  initStore('basic');

  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  console.log(`🚀 lecture app running on http://localhost:${port}`);
}
void bootstrap();
```

- [ ] **Step 4.5: 커밋**

```bash
git add apps/lecture/src/main.ts apps/lecture/src/app.module.ts apps/lecture/src/common/
git commit -m "feat(lecture): app skeleton with call counter interceptor + apollo plugin"
```

---

## Task 5: Ch01 — REST BFF (3개 클라이언트별 컨트롤러)

**Files:**
- Create: `apps/lecture/src/ch01-rest-pain/ch01.module.ts`
- Create: `apps/lecture/src/ch01-rest-pain/repositories.ts`
- Create: `apps/lecture/src/ch01-rest-pain/web-bff.controller.ts`
- Create: `apps/lecture/src/ch01-rest-pain/mobile-bff.controller.ts`
- Create: `apps/lecture/src/ch01-rest-pain/admin-bff.controller.ts`
- Create: `apps/lecture/src/ch01-rest-pain/README.md`

- [ ] **Step 5.1: `apps/lecture/src/ch01-rest-pain/repositories.ts`**

```typescript
// Ch01–Ch05가 공유하는 MockRepository 인스턴스 모음.
// 챕터별로 같은 데이터에 접근하지만 호출 카운트는 각 요청 컨텍스트에서 격리된다.
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
```

- [ ] **Step 5.2: `apps/lecture/src/ch01-rest-pain/web-bff.controller.ts`**

```typescript
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { orderRepo, productRepo, reviewRepo, userRepo } from './repositories';

// Web BFF — 데스크톱 상품 상세 페이지가 사용한다.
// 한 화면을 그리려면 여러 엔드포인트를 호출해야 함을 의도적으로 보여준다.
@Controller('web')
export class WebBffController {
  // 상품 기본 정보 + 통계
  @Get('products/:id')
  async product(@Param('id', ParseIntPipe) id: number) {
    const product = await productRepo.findOne(id);
    if (!product) return null;

    const reviews = await reviewRepo.findMany((r) => r.productId === id);
    const avgRating =
      reviews.length === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description,
      reviewCount: reviews.length,
      avgRating: Number(avgRating.toFixed(2)),
      // 주의: 작성자 이름은 별도 호출 — Web BFF는 리뷰 본문 따로 fetch
    };
  }

  // 상품 리뷰 목록 — userName 평탄화 포함 (REST 모델 복제 사례)
  @Get('products/:id/reviews')
  async productReviews(@Param('id', ParseIntPipe) id: number) {
    const reviews = await reviewRepo.findMany((r) => r.productId === id);
    const result = [];
    for (const r of reviews) {
      const user = await userRepo.findOne(r.userId);
      result.push({
        id: r.id,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt,
        userId: r.userId,
        // userName이 여기에도 박혀 있음 — 다른 BFF에서도 동일 구조로 복제됨
        userName: user?.name ?? 'Unknown',
      });
    }
    return result;
  }

  // 사용자 프로필 카드용
  @Get('users/:id')
  async user(@Param('id', ParseIntPipe) id: number) {
    const user = await userRepo.findOne(id);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      // Web 카드용 추가 필드
      memberSince: user.createdAt,
    };
  }
}
```

- [ ] **Step 5.3: `apps/lecture/src/ch01-rest-pain/mobile-bff.controller.ts`**

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { orderItemRepo, orderRepo, productRepo } from './repositories';

// Mobile BFF — 모바일 홈 화면 (가벼운 응답)
// 같은 데이터를 다른 모양으로 가공 — User 모델 파편화의 시작.
@Controller('mobile')
export class MobileBffController {
  // 모바일 카드 그리드 — 가격과 재고만
  @Get('products')
  async products(@Query('limit') limitRaw?: string) {
    const limit = Number(limitRaw ?? 10);
    const products = await productRepo.findMany();
    return products.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      inStock: p.stock > 0,
    }));
  }

  // 내 주문 — 모바일은 totalAmount만 노출
  @Get('orders/me')
  async myOrders(@Query('userId') userIdRaw?: string) {
    const userId = Number(userIdRaw ?? 1);
    const orders = await orderRepo.findMany((o) => o.userId === userId);
    const result = [];
    for (const o of orders) {
      const items = await orderItemRepo.findMany((it) => it.orderId === o.id);
      result.push({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        itemCount: items.length,
      });
    }
    return result;
  }
}
```

- [ ] **Step 5.4: `apps/lecture/src/ch01-rest-pain/admin-bff.controller.ts`**

```typescript
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  orderItemRepo,
  orderRepo,
  productRepo,
  reviewRepo,
  userRepo,
} from './repositories';

// Admin BFF — 운영 대시보드 (모든 필드 + 집계)
// 같은 User에 대해 가장 풍부한 응답 — 또 다른 모양으로의 복제.
@Controller('admin')
export class AdminBffController {
  // 전체 사용자 + 주문 수
  @Get('users')
  async users() {
    const users = await userRepo.findMany();
    const result = [];
    for (const u of users) {
      const orders = await orderRepo.findMany((o) => o.userId === u.id);
      const reviews = await reviewRepo.findMany((r) => r.userId === u.id);
      result.push({
        id: u.id,
        // userName 또 등장 — 이번엔 fullName이라는 이름으로 변경되었다고 가정
        // (운영팀이 먼저 컬럼명을 바꿨다가 다른 BFF에는 전파 못함)
        fullName: u.name,
        email: u.email,
        createdAt: u.createdAt,
        orderCount: orders.length,
        reviewCount: reviews.length,
      });
    }
    return result;
  }

  // 상품 상세 + 모든 통계
  @Get('products/:id')
  async product(@Param('id', ParseIntPipe) id: number) {
    const product = await productRepo.findOne(id);
    if (!product) return null;
    const items = await orderItemRepo.findMany((it) => it.productId === id);
    const reviews = await reviewRepo.findMany((r) => r.productId === id);
    return {
      ...product,
      totalSold: items.reduce((s, it) => s + it.quantity, 0),
      revenue: items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
      reviewCount: reviews.length,
      avgRating:
        reviews.length === 0
          ? 0
          : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
    };
  }
}
```

- [ ] **Step 5.5: `apps/lecture/src/ch01-rest-pain/ch01.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AdminBffController } from './admin-bff.controller';
import { MobileBffController } from './mobile-bff.controller';
import { WebBffController } from './web-bff.controller';

@Module({
  controllers: [WebBffController, MobileBffController, AdminBffController],
})
export class Ch01RestModule {}
```

- [ ] **Step 5.6: `apps/lecture/src/ch01-rest-pain/README.md`**

```markdown
# Ch01 — REST로 만든 첫 쇼핑몰

## 시나리오

이커머스를 REST로 시작했다. Web/Mobile/Admin 세 클라이언트의 요구가 달라 BFF가 3개로 갈라졌다. 이번 챕터에서는 다음을 직접 체감한다.

1. **BFF 파편화** — `User` 도메인이 응답마다 다른 모양으로 등장
2. **모델 복제** — `userName`이 여러 응답에 중복으로 박힘
3. **변경 전파 실패** — Admin BFF는 이미 `fullName`으로 바꿨지만 Web BFF는 여전히 `userName`
4. **언더페칭** — 상품 상세 페이지를 그리려면 3개 엔드포인트 호출

## 실행

```bash
pnpm start:dev
```

## 시연

1) 상품 상세 페이지 데이터 모으기 (Web BFF)
```bash
curl -i http://localhost:3000/web/products/1
curl -i http://localhost:3000/web/products/1/reviews
curl -i http://localhost:3000/web/users/1
```
응답 헤더 `x-mock-db-calls`에 누적 호출 수를 확인. 한 화면을 위해 3번의 HTTP + 다수의 mock DB 호출이 발생했음을 본다.

2) 같은 User가 응답마다 다른 모양
```bash
curl -s http://localhost:3000/web/users/1 | jq .       # name
curl -s http://localhost:3000/admin/users | jq '.[0]'  # fullName
```

3) 모바일 응답
```bash
curl -i http://localhost:3000/mobile/products?limit=5
curl -i http://localhost:3000/mobile/orders/me?userId=1
```

## 다음 챕터로

이 모든 호출을 **단 하나의 GraphQL 쿼리**로 합치는 것을 Ch02에서 본다.
```

- [ ] **Step 5.7: 검증 (수동 시연)**

```bash
pnpm start:dev
# 다른 터미널에서
curl -i http://localhost:3000/web/products/1
curl -i http://localhost:3000/web/products/1/reviews
curl -i http://localhost:3000/admin/users
```

Expected: 각 응답에 `x-mock-db-calls: User=N, ...` 헤더, 200 OK, JSON body.

- [ ] **Step 5.8: 커밋**

```bash
git add apps/lecture/src/ch01-rest-pain/
git commit -m "feat(ch01): REST BFF triplet — Web/Mobile/Admin demonstrating fragmentation"
```

---

## Task 6: Ch02 — GraphQL 첫 도입 (Code-First, 단일 엔드포인트)

**Files:**
- Create: `apps/lecture/src/ch02-graphql-basics/ch02.module.ts`
- Create: `apps/lecture/src/ch02-graphql-basics/models/{user,product,order,order-item,review,category}.model.ts`
- Create: `apps/lecture/src/ch02-graphql-basics/resolvers/{user,product,order}.resolver.ts`
- Create: `apps/lecture/src/ch02-graphql-basics/README.md`
- Create: `operations/ch02-storefront.graphql`
- Modify: `apps/lecture/src/app.module.ts` (주석 토글)

- [ ] **Step 6.1: `models/user.model.ts`**

```typescript
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('User')
export class UserType {
  @Field(() => Int)
  id!: number;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field()
  createdAt!: Date;
}
```

- [ ] **Step 6.2: `models/product.model.ts`**

```typescript
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Product')
export class ProductType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  stock!: number;

  @Field()
  description!: string;

  @Field()
  createdAt!: Date;
}
```

- [ ] **Step 6.3: `models/category.model.ts`**

```typescript
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Category')
export class CategoryType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;
}
```

- [ ] **Step 6.4: `models/order-item.model.ts`**

```typescript
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('OrderItem')
export class OrderItemType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  productId!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;
}
```

- [ ] **Step 6.5: `models/order.model.ts`**

```typescript
import { Field, Float, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderItemType } from './order-item.model';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(OrderStatusEnum, { name: 'OrderStatus' });

@ObjectType('Order')
export class OrderType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  userId!: number;

  @Field(() => OrderStatusEnum)
  status!: OrderStatusEnum;

  @Field(() => Float)
  totalAmount!: number;

  @Field()
  createdAt!: Date;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];
}
```

> Ch02에서는 `items`를 미리 합쳐 평탄화로 응답한다. Ch03에서 Field Resolver로 분리하며 정규화 학습.

- [ ] **Step 6.6: `models/review.model.ts`**

```typescript
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Review')
export class ReviewType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  userId!: number;

  @Field(() => Int)
  productId!: number;

  @Field(() => Int)
  rating!: number;

  @Field()
  content!: string;

  @Field()
  createdAt!: Date;
}
```

- [ ] **Step 6.7: `resolvers/user.resolver.ts`**

```typescript
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { userRepo } from '../../ch01-rest-pain/repositories';
import { UserType } from '../models/user.model';

@Resolver(() => UserType)
export class Ch02UserResolver {
  @Query(() => UserType, { nullable: true, name: 'user' })
  async user(@Args('id', { type: () => Int }) id: number): Promise<UserType | null> {
    return (await userRepo.findOne(id)) ?? null;
  }

  @Query(() => [UserType], { name: 'users' })
  async users(): Promise<UserType[]> {
    return userRepo.findMany();
  }
}
```

- [ ] **Step 6.8: `resolvers/product.resolver.ts`**

```typescript
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
```

- [ ] **Step 6.9: `resolvers/order.resolver.ts`**

```typescript
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { orderItemRepo, orderRepo } from '../../ch01-rest-pain/repositories';
import { OrderType } from '../models/order.model';

@Resolver(() => OrderType)
export class Ch02OrderResolver {
  @Query(() => OrderType, { nullable: true, name: 'order' })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    const order = await orderRepo.findOne(id);
    if (!order) return null;
    const items = await orderItemRepo.findMany((it) => it.orderId === id);
    return { ...order, items } as unknown as OrderType;
  }

  @Query(() => [OrderType], { name: 'orders' })
  async orders(): Promise<OrderType[]> {
    const orders = await orderRepo.findMany();
    const result: OrderType[] = [];
    for (const o of orders) {
      const items = await orderItemRepo.findMany((it) => it.orderId === o.id);
      result.push({ ...o, items } as unknown as OrderType);
    }
    return result;
  }
}
```

- [ ] **Step 6.10: `ch02.module.ts`**

```typescript
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { ApolloCallCounterPlugin } from '../common/apollo-call-counter.plugin';
import { Ch02OrderResolver } from './resolvers/order.resolver';
import { Ch02ProductResolver } from './resolvers/product.resolver';
import { Ch02UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/lecture/src/ch02-graphql-basics/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
      // Apollo Sandbox(개발용 GUI) — http://localhost:3000/graphql
    }),
  ],
  providers: [
    Ch02UserResolver,
    Ch02ProductResolver,
    Ch02OrderResolver,
    ApolloCallCounterPlugin,
  ],
})
export class Ch02GraphQLModule {}
```

- [ ] **Step 6.11: `apps/lecture/src/ch02-graphql-basics/README.md`**

```markdown
# Ch02 — GraphQL 첫 도입

## 시나리오

Ch01의 BFF 3개를 단일 `/graphql` 엔드포인트로 통합한다. 클라이언트는 자기 화면에 필요한 모양 그대로 한 쿼리에서 받는다.

## 활성화

`apps/lecture/src/app.module.ts`에서 Ch01 import를 주석 처리하고 Ch02 import의 주석을 해제. 저장하면 `start:dev`가 자동 재기동.

## 실행

```bash
pnpm start:dev
# http://localhost:3000/graphql 에서 Apollo Sandbox 열림
```

## 시연 쿼리

`operations/ch02-storefront.graphql` 참고. 한 쿼리로 상품 상세 페이지 데이터 모두 받기.

## 학습 포인트

- `@ObjectType`, `@Field`, `@Resolver`, `@Query`로 Code-First 스키마 정의
- 자동 생성된 `schema.gql` 살펴보기 (Code-First → SDL)
- Schema 탭에서 Introspection 동작 확인
- `!` (NonNull), `[T]` (List), `[T!]!` 의미
- Ch01 동일 데이터를 단일 호출로 받음 (응답 헤더 `x-mock-db-calls` 비교)
```

- [ ] **Step 6.12: `operations/ch02-storefront.graphql`**

```graphql
# 상품 상세 페이지가 한 쿼리로 필요한 모든 데이터를 가져온다.
# Ch01의 web-bff에서 3번 호출했던 데이터를 1번에 받는다.
query StorefrontProductPage($id: Int!) {
  product(id: $id) {
    id
    name
    price
    stock
    description
  }
  user(id: 1) {
    id
    name
    email
  }
}
```

- [ ] **Step 6.13: `app.module.ts` 업데이트 (Ch01 → Ch02 토글 예시)**

`app.module.ts`의 import 부분을 Ch02 사용 예시로 갱신할 필요 없음. Ch01이 기본이고 학습자가 직접 토글. 이 단계에서는 변경 없이 다음 단계로.

- [ ] **Step 6.14: 검증**

`app.module.ts`에서 일시적으로 Ch01을 주석 처리하고 Ch02 활성화 후:

```bash
pnpm start:dev
# 다른 터미널
curl -X POST http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ product(id:1){ id name price } user(id:1){ id name } }"}' -i
```

Expected: 응답 JSON에 `data.product`, `data.user` 채워짐. 헤더에 `x-mock-db-calls`. Apollo Sandbox 페이지가 `http://localhost:3000/graphql`에서 열림.

- [ ] **Step 6.15: 커밋**

```bash
git add apps/lecture/src/ch02-graphql-basics/ operations/ch02-storefront.graphql
git commit -m "feat(ch02): Code-First GraphQL with single endpoint"
```

---

## Task 7: Ch03 — 데이터 그래프 + 정규화 (Field Resolvers)

**Files:**
- Create: `apps/lecture/src/ch03-data-graph/ch03.module.ts`
- Create: `apps/lecture/src/ch03-data-graph/models/{user,product,order,order-item,review,category}.model.ts`
- Create: `apps/lecture/src/ch03-data-graph/resolvers/{user,product,order}.resolver.ts`
- Create: `apps/lecture/src/ch03-data-graph/README.md`
- Create: `operations/ch03-order-detail.graphql`

- [ ] **Step 7.1: `models/user.model.ts`** (Ch02와 동일)

```typescript
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('User')
export class UserType {
  @Field(() => Int)
  id!: number;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field()
  createdAt!: Date;
}
```

- [ ] **Step 7.2: `models/category.model.ts`**

```typescript
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Category')
export class CategoryType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;
}
```

- [ ] **Step 7.3: `models/review.model.ts`**

```typescript
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { UserType } from './user.model';

@ObjectType('Review')
export class ReviewType {
  @Field(() => Int)
  id!: number;

  // userId만 저장 — author는 Field Resolver가 해결.
  @Field(() => Int)
  userId!: number;

  @Field(() => Int)
  productId!: number;

  @Field(() => Int)
  rating!: number;

  @Field()
  content!: string;

  @Field()
  createdAt!: Date;

  // 정규화: userName을 박지 않는다. author.name으로 클라이언트가 명시.
  @Field(() => UserType, { nullable: true })
  author?: UserType;
}
```

- [ ] **Step 7.4: `models/product.model.ts`**

```typescript
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { CategoryType } from './category.model';
import { ReviewType } from './review.model';

@ObjectType('Product')
export class ProductType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  stock!: number;

  @Field()
  description!: string;

  @Field()
  createdAt!: Date;

  @Field(() => [CategoryType])
  categories?: CategoryType[];

  @Field(() => [ReviewType])
  reviews?: ReviewType[];
}
```

- [ ] **Step 7.5: `models/order-item.model.ts`**

```typescript
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ProductType } from './product.model';

@ObjectType('OrderItem')
export class OrderItemType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  productId!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;

  // product는 Field Resolver가 해결한다.
  @Field(() => ProductType, { nullable: true })
  product?: ProductType;
}
```

- [ ] **Step 7.6: `models/order.model.ts`**

```typescript
import { Field, Float, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderItemType } from './order-item.model';
import { UserType } from './user.model';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(OrderStatusEnum, { name: 'OrderStatus' });

@ObjectType('Order')
export class OrderType {
  @Field(() => Int)
  id!: number;

  // 정규화의 핵심 — userName을 갖지 않는다. user 참조만 보유.
  @Field(() => Int)
  userId!: number;

  @Field(() => OrderStatusEnum)
  status!: OrderStatusEnum;

  @Field(() => Float)
  totalAmount!: number;

  @Field()
  createdAt!: Date;

  @Field(() => UserType, { nullable: true })
  user?: UserType;

  @Field(() => [OrderItemType])
  items?: OrderItemType[];
}
```

- [ ] **Step 7.7: `resolvers/user.resolver.ts`**

```typescript
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { userRepo } from '../../ch01-rest-pain/repositories';
import { UserType } from '../models/user.model';

@Resolver(() => UserType)
export class Ch03UserResolver {
  @Query(() => UserType, { nullable: true, name: 'user' })
  async user(@Args('id', { type: () => Int }) id: number): Promise<UserType | null> {
    return (await userRepo.findOne(id)) ?? null;
  }
}
```

- [ ] **Step 7.8: `resolvers/product.resolver.ts`**

```typescript
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

  // Field Resolver — 클라이언트가 product { reviews } 요청할 때만 실행
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
```

- [ ] **Step 7.9: `resolvers/order.resolver.ts`**

```typescript
import { Args, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
  orderItemRepo,
  orderRepo,
  productRepo,
  userRepo,
} from '../../ch01-rest-pain/repositories';
import { OrderItemType } from '../models/order-item.model';
import { OrderType } from '../models/order.model';
import { ProductType } from '../models/product.model';
import { UserType } from '../models/user.model';
import { ReviewType } from '../models/review.model';

@Resolver(() => OrderType)
export class Ch03OrderResolver {
  @Query(() => OrderType, { nullable: true, name: 'order' })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    return (await orderRepo.findOne(id)) ?? null;
  }

  @Query(() => [OrderType], { name: 'orders' })
  async orders(): Promise<OrderType[]> {
    return orderRepo.findMany();
  }

  // Order 자체는 userId만 갖는다. user는 별도 호출.
  @ResolveField(() => UserType, { nullable: true })
  async user(@Parent() order: OrderType): Promise<UserType | null> {
    return (await userRepo.findOne(order.userId)) ?? null;
  }

  @ResolveField(() => [OrderItemType])
  async items(@Parent() order: OrderType): Promise<OrderItemType[]> {
    return orderItemRepo.findMany((it) => it.orderId === order.id);
  }
}

@Resolver(() => OrderItemType)
export class Ch03OrderItemResolver {
  @ResolveField(() => ProductType, { nullable: true })
  async product(@Parent() item: OrderItemType): Promise<ProductType | null> {
    return (await productRepo.findOne(item.productId)) ?? null;
  }
}

@Resolver(() => ReviewType)
export class Ch03ReviewResolver {
  @ResolveField(() => UserType, { nullable: true, name: 'author' })
  async author(@Parent() review: ReviewType): Promise<UserType | null> {
    return (await userRepo.findOne(review.userId)) ?? null;
  }
}
```

- [ ] **Step 7.10: `ch03.module.ts`**

```typescript
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { ApolloCallCounterPlugin } from '../common/apollo-call-counter.plugin';
import {
  Ch03OrderItemResolver,
  Ch03OrderResolver,
  Ch03ReviewResolver,
} from './resolvers/order.resolver';
import { Ch03ProductResolver } from './resolvers/product.resolver';
import { Ch03UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/lecture/src/ch03-data-graph/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
    }),
  ],
  providers: [
    Ch03UserResolver,
    Ch03ProductResolver,
    Ch03OrderResolver,
    Ch03OrderItemResolver,
    Ch03ReviewResolver,
    ApolloCallCounterPlugin,
  ],
})
export class Ch03DataGraphModule {}
```

- [ ] **Step 7.11: `operations/ch03-order-detail.graphql`**

```graphql
# 정규화된 그래프 탐색.
# Order는 userName을 갖지 않고 user 참조만 가진다.
# 클라이언트가 user { name }을 명시할 때만 User Field Resolver가 호출된다.
query OrderDetail($id: Int!) {
  order(id: $id) {
    id
    status
    totalAmount
    createdAt
    user {
      id
      name      # User 한 곳만 진실의 원천 — name → fullName 변경 시 한 번만 수정
      email
    }
    items {
      id
      quantity
      unitPrice
      product {
        id
        name
        price
      }
    }
  }
}
```

- [ ] **Step 7.12: `apps/lecture/src/ch03-data-graph/README.md`**

```markdown
# Ch03 — 데이터 그래프 설계 + 정규화

## 시나리오

Ch02의 평탄화된 응답을 정규화된 그래프로 재설계한다. `Order` 타입은 `userName`을 갖지 않으며 `user: User` 참조만 보유. Field Resolver가 lazy하게 관계를 해결한다.

## 활성화

`app.module.ts`에서 다른 챕터를 주석 처리하고 `Ch03DataGraphModule`만 활성화.

## 시연 쿼리

`operations/ch03-order-detail.graphql` 참고.

## 학습 포인트

- **데이터 정규화** — `userName`을 응답에 박지 않는다. User 정의가 한 곳만 있다.
- `@ResolveField` 데코레이터로 관계 필드를 별도 메서드로 분리
- 클라이언트가 `user { name }`을 명시하지 않으면 User Resolver는 호출되지 않음
- `User` 모델의 `name`을 `fullName`으로 바꾸면? — 한 곳만 수정하면 모든 응답에 자동 반영
- 단점 미리보기: 주문 100개를 가져오면 User Resolver가 100번 호출됨 → **Ch04에서 해결**

## name → fullName 시뮬레이션

`apps/lecture/src/ch03-data-graph/models/user.model.ts`에서 `name` 필드명을 `fullName`으로 바꿔본다. 모든 쿼리가 일관되게 따라온다.
```

- [ ] **Step 7.13: 검증**

`app.module.ts`에서 Ch03만 활성화 후:

```bash
pnpm start:dev
curl -X POST http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ order(id:1){ id user{ name email } items{ quantity product{ name price } } } }"}' -i
```

Expected: `data.order.user.name`, `data.order.items[].product.name` 등 모두 채워짐. 헤더에 `x-mock-db-calls` 카운트가 Ch02보다 많아짐 (Field Resolver 추가 호출).

- [ ] **Step 7.14: 커밋**

```bash
git add apps/lecture/src/ch03-data-graph/ operations/ch03-order-detail.graphql
git commit -m "feat(ch03): data graph with field resolvers and reference-based normalization"
```

---

## Task 8: Ch04 — 리졸버 N+1 + DataLoader

**Files:**
- Create: `apps/lecture/src/ch04-n-plus-one/ch04.module.ts`
- Create: `apps/lecture/src/ch04-n-plus-one/loaders/{user,product}.loader.ts`
- Create: `apps/lecture/src/ch04-n-plus-one/loaders/index.ts`
- Create: `apps/lecture/src/ch04-n-plus-one/models/...` (Ch03 동일)
- Create: `apps/lecture/src/ch04-n-plus-one/resolvers/{user,product,order}.resolver.ts`
- Create: `apps/lecture/src/ch04-n-plus-one/README.md`
- Create: `operations/ch04-list-orders.graphql`

- [ ] **Step 8.1: 모델 복사**

`apps/lecture/src/ch03-data-graph/models/`의 6개 파일을 `apps/lecture/src/ch04-n-plus-one/models/`로 복사. 챕터 격리를 위해 같은 코드를 유지한다.

```bash
mkdir -p apps/lecture/src/ch04-n-plus-one/models
cp apps/lecture/src/ch03-data-graph/models/*.ts apps/lecture/src/ch04-n-plus-one/models/
```

- [ ] **Step 8.2: `loaders/user.loader.ts`**

```typescript
import DataLoader from 'dataloader';
import { User } from '@app/mock-data';
import { userRepo } from '../../ch01-rest-pain/repositories';

// per-request DataLoader 팩토리.
// 같은 tick에 들어온 user.load(id) 호출들을 모아 1번의 findByIds로 처리한다.
export function createUserLoader(): DataLoader<number, User | null> {
  return new DataLoader<number, User | null>(async (ids) => {
    const users = await userRepo.findByIds(ids);
    return users.map((u) => u ?? null);
  });
}
```

- [ ] **Step 8.3: `loaders/product.loader.ts`**

```typescript
import DataLoader from 'dataloader';
import { Product } from '@app/mock-data';
import { productRepo } from '../../ch01-rest-pain/repositories';

export function createProductLoader(): DataLoader<number, Product | null> {
  return new DataLoader<number, Product | null>(async (ids) => {
    const products = await productRepo.findByIds(ids);
    return products.map((p) => p ?? null);
  });
}
```

- [ ] **Step 8.4: `loaders/index.ts`**

```typescript
import { createProductLoader } from './product.loader';
import { createUserLoader } from './user.loader';

export interface AppLoaders {
  user: ReturnType<typeof createUserLoader>;
  product: ReturnType<typeof createProductLoader>;
}

export interface AppContext {
  loaders: AppLoaders;
}

// GraphQL 요청마다 호출되어 격리된 캐시/배치를 보장한다.
export function createLoaders(): AppLoaders {
  return {
    user: createUserLoader(),
    product: createProductLoader(),
  };
}
```

- [ ] **Step 8.5: `resolvers/user.resolver.ts`**

```typescript
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { userRepo } from '../../ch01-rest-pain/repositories';
import { UserType } from '../models/user.model';

@Resolver(() => UserType)
export class Ch04UserResolver {
  @Query(() => UserType, { nullable: true, name: 'user' })
  async user(@Args('id', { type: () => Int }) id: number): Promise<UserType | null> {
    return (await userRepo.findOne(id)) ?? null;
  }
}
```

- [ ] **Step 8.6: `resolvers/product.resolver.ts`**

```typescript
import {
  Args,
  Context,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { getStore } from '@app/mock-data';
import { productRepo, reviewRepo } from '../../ch01-rest-pain/repositories';
import { AppContext } from '../loaders';
import { CategoryType } from '../models/category.model';
import { ProductType } from '../models/product.model';
import { ReviewType } from '../models/review.model';

@Resolver(() => ProductType)
export class Ch04ProductResolver {
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

// Review.author도 DataLoader로 배치
@Resolver(() => ReviewType)
export class Ch04ReviewResolver {
  @ResolveField(() => 'User', { nullable: true, name: 'author' })
  async author(
    @Parent() review: ReviewType,
    @Context() ctx: AppContext,
  ): Promise<unknown> {
    return ctx.loaders.user.load(review.userId);
  }
}
```

> 위 코드의 `@ResolveField(() => 'User', ...)`는 동작하지 않음. **올바른 형태**:

`resolvers/product.resolver.ts`의 ReviewResolver만 별도 파일로 분리하고 정확히 작성:

- [ ] **Step 8.7: `resolvers/review.resolver.ts`**

```typescript
import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AppContext } from '../loaders';
import { ReviewType } from '../models/review.model';
import { UserType } from '../models/user.model';

@Resolver(() => ReviewType)
export class Ch04ReviewResolver {
  // DataLoader로 배칭 — 100개 리뷰의 author를 1번의 findByIds로 처리
  @ResolveField(() => UserType, { nullable: true, name: 'author' })
  async author(
    @Parent() review: ReviewType,
    @Context() ctx: AppContext,
  ): Promise<UserType | null> {
    return ctx.loaders.user.load(review.userId);
  }
}
```

이제 `resolvers/product.resolver.ts`에서 `Ch04ReviewResolver` 정의를 제거(별도 파일로 이동).

- [ ] **Step 8.8: `resolvers/order.resolver.ts`**

```typescript
import {
  Args,
  Context,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  orderItemRepo,
  orderRepo,
} from '../../ch01-rest-pain/repositories';
import { AppContext } from '../loaders';
import { OrderItemType } from '../models/order-item.model';
import { OrderType } from '../models/order.model';
import { ProductType } from '../models/product.model';
import { UserType } from '../models/user.model';

@Resolver(() => OrderType)
export class Ch04OrderResolver {
  @Query(() => OrderType, { nullable: true, name: 'order' })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    return (await orderRepo.findOne(id)) ?? null;
  }

  @Query(() => [OrderType], { name: 'orders' })
  async orders(): Promise<OrderType[]> {
    return orderRepo.findMany();
  }

  // 100개 주문도 user 호출 1번 — DataLoader 배칭 효과
  @ResolveField(() => UserType, { nullable: true })
  async user(
    @Parent() order: OrderType,
    @Context() ctx: AppContext,
  ): Promise<UserType | null> {
    return ctx.loaders.user.load(order.userId);
  }

  @ResolveField(() => [OrderItemType])
  async items(@Parent() order: OrderType): Promise<OrderItemType[]> {
    return orderItemRepo.findMany((it) => it.orderId === order.id);
  }
}

@Resolver(() => OrderItemType)
export class Ch04OrderItemResolver {
  // 모든 OrderItem의 product를 1번에 배치
  @ResolveField(() => ProductType, { nullable: true })
  async product(
    @Parent() item: OrderItemType,
    @Context() ctx: AppContext,
  ): Promise<ProductType | null> {
    return ctx.loaders.product.load(item.productId);
  }
}
```

- [ ] **Step 8.9: `ch04.module.ts`**

```typescript
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { ApolloCallCounterPlugin } from '../common/apollo-call-counter.plugin';
import { createLoaders } from './loaders';
import {
  Ch04OrderItemResolver,
  Ch04OrderResolver,
} from './resolvers/order.resolver';
import { Ch04ProductResolver } from './resolvers/product.resolver';
import { Ch04ReviewResolver } from './resolvers/review.resolver';
import { Ch04UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/lecture/src/ch04-n-plus-one/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
      // per-request DataLoader 인스턴스를 컨텍스트로 주입
      context: () => ({ loaders: createLoaders() }),
    }),
  ],
  providers: [
    Ch04UserResolver,
    Ch04ProductResolver,
    Ch04OrderResolver,
    Ch04OrderItemResolver,
    Ch04ReviewResolver,
    ApolloCallCounterPlugin,
  ],
})
export class Ch04DataLoaderModule {}
```

- [ ] **Step 8.10: `operations/ch04-list-orders.graphql`**

```graphql
# 주문 20개 + 각 주문의 user + items + 각 item의 product
# 응답 헤더 x-mock-db-calls를 비교한다.
# Ch03(naive): User=20+, Product=수십 회
# Ch04(DataLoader): User=1, Product=1
query ListOrdersWithItems {
  orders {
    id
    status
    totalAmount
    user { id name }
    items {
      quantity
      unitPrice
      product { id name price }
    }
  }
}
```

- [ ] **Step 8.11: `apps/lecture/src/ch04-n-plus-one/README.md`**

```markdown
# Ch04 — 리졸버에서 또 N+1?

## 시나리오

Ch03 구조로 주문 20개를 가져오니 mock DB 호출이 100회를 넘는다. 각 주문마다 User, 각 OrderItem마다 Product를 따로 조회하기 때문. 같은 쿼리가 DataLoader 도입 후 한 자릿수로 떨어지는 것을 본다.

## 시연

1단계 — Ch03 모듈 활성화 후:
```bash
curl -X POST http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d @operations/ch04-list-orders.graphql -i | grep x-mock-db-calls
```

2단계 — Ch04 모듈로 교체 후 같은 쿼리:
```bash
curl -X POST http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d @operations/ch04-list-orders.graphql -i | grep x-mock-db-calls
```

`x-mock-db-calls` 값을 비교 — 한 자릿수 차이가 보여야 합격.

## 학습 포인트

- DataLoader는 같은 tick의 `load(id)` 호출들을 모아 1번의 batch fetch로 변환
- per-request 인스턴스 — 응답 간 캐시 누수 방지
- ORM의 `include`와 다른 결 — 리졸버 분리 구조를 깨지 않으면서 배칭
- DataLoader는 또한 같은 요청 내 캐시도 제공 (`load(1)` 두 번 → 1번만 fetch)
```

- [ ] **Step 8.12: 검증**

```bash
pnpm start:dev
# Ch03 모드에서 호출 카운트 확인 후
# Ch04 모드로 토글 → 같은 쿼리 → 호출 카운트 비교
```

Expected: Ch04에서 `x-mock-db-calls`의 `User`, `Product` 값이 1로 떨어짐.

- [ ] **Step 8.13: 커밋**

```bash
git add apps/lecture/src/ch04-n-plus-one/ operations/ch04-list-orders.graphql
git commit -m "feat(ch04): DataLoader for batching field resolver calls"
```

---

## Task 9: Ch05 — 클라이언트 Operations + Subscription

**Files:**
- Create: `apps/lecture/src/ch05-client-operations/ch05.module.ts`
- Create: `apps/lecture/src/ch05-client-operations/pubsub.provider.ts`
- Create: `apps/lecture/src/ch05-client-operations/models/...` (Ch04 동일)
- Create: `apps/lecture/src/ch05-client-operations/loaders/...` (Ch04 동일)
- Create: `apps/lecture/src/ch05-client-operations/resolvers/order.resolver.ts` (+ Mutation, Subscription)
- Create: `apps/lecture/src/ch05-client-operations/resolvers/...` (나머지)
- Create: `operations/ch05/{good-getProduct,anti-overfetch,fragment-userCard,conditional-admin,subscribe-orderStatus}.graphql`
- Create: `apps/lecture/src/ch05-client-operations/README.md`

- [ ] **Step 9.1: 모델 + 로더 복사**

```bash
mkdir -p apps/lecture/src/ch05-client-operations/models apps/lecture/src/ch05-client-operations/loaders apps/lecture/src/ch05-client-operations/resolvers
cp apps/lecture/src/ch04-n-plus-one/models/*.ts apps/lecture/src/ch05-client-operations/models/
cp apps/lecture/src/ch04-n-plus-one/loaders/*.ts apps/lecture/src/ch05-client-operations/loaders/
cp apps/lecture/src/ch04-n-plus-one/resolvers/user.resolver.ts apps/lecture/src/ch05-client-operations/resolvers/user.resolver.ts
cp apps/lecture/src/ch04-n-plus-one/resolvers/product.resolver.ts apps/lecture/src/ch05-client-operations/resolvers/product.resolver.ts
cp apps/lecture/src/ch04-n-plus-one/resolvers/review.resolver.ts apps/lecture/src/ch05-client-operations/resolvers/review.resolver.ts
```

복사한 파일들의 클래스명을 `Ch04xxx` → `Ch05xxx`로 일괄 변경.

- [ ] **Step 9.2: `pubsub.provider.ts`**

```typescript
import { PubSub } from 'graphql-subscriptions';

// 단일 PubSub 인스턴스 — 학습용. 프로덕션에서는 Redis PubSub 사용.
export const PUB_SUB = 'PUB_SUB';

export const pubsubProvider = {
  provide: PUB_SUB,
  useValue: new PubSub(),
};
```

- [ ] **Step 9.3: `resolvers/order.resolver.ts`**

```typescript
import { Inject } from '@nestjs/common';
import {
  Args,
  Context,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import type { PubSub } from 'graphql-subscriptions';
import { getStore, OrderStatus } from '@app/mock-data';
import {
  orderItemRepo,
  orderRepo,
} from '../../ch01-rest-pain/repositories';
import { AppContext } from '../loaders';
import { OrderItemType } from '../models/order-item.model';
import { OrderStatusEnum, OrderType } from '../models/order.model';
import { ProductType } from '../models/product.model';
import { UserType } from '../models/user.model';
import { PUB_SUB } from '../pubsub.provider';

const ORDER_STATUS_CHANGED = 'orderStatusChanged';

@Resolver(() => OrderType)
export class Ch05OrderResolver {
  constructor(@Inject(PUB_SUB) private readonly pubsub: PubSub) {}

  @Query(() => OrderType, { nullable: true, name: 'order' })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    return (await orderRepo.findOne(id)) ?? null;
  }

  @Query(() => [OrderType], { name: 'orders' })
  async orders(): Promise<OrderType[]> {
    return orderRepo.findMany();
  }

  // 시연용 mutation — 상태 변경 시 구독자에게 push
  @Mutation(() => OrderType)
  async updateOrderStatus(
    @Args('id', { type: () => Int }) id: number,
    @Args('status', { type: () => OrderStatusEnum }) status: OrderStatusEnum,
  ): Promise<OrderType> {
    const store = getStore();
    const order = store.orders.find((o) => o.id === id);
    if (!order) throw new Error(`Order ${id} not found`);
    order.status = status as OrderStatus;
    await this.pubsub.publish(ORDER_STATUS_CHANGED, { orderStatusChanged: order });
    return order as OrderType;
  }

  // 폴링 없이 실시간으로 상태 변경 받기
  @Subscription(() => OrderType, { name: ORDER_STATUS_CHANGED })
  orderStatusChanged() {
    return this.pubsub.asyncIterableIterator(ORDER_STATUS_CHANGED);
  }

  @ResolveField(() => UserType, { nullable: true })
  async user(
    @Parent() order: OrderType,
    @Context() ctx: AppContext,
  ): Promise<UserType | null> {
    return ctx.loaders.user.load(order.userId);
  }

  @ResolveField(() => [OrderItemType])
  async items(@Parent() order: OrderType): Promise<OrderItemType[]> {
    return orderItemRepo.findMany((it) => it.orderId === order.id);
  }
}

@Resolver(() => OrderItemType)
export class Ch05OrderItemResolver {
  @ResolveField(() => ProductType, { nullable: true })
  async product(
    @Parent() item: OrderItemType,
    @Context() ctx: AppContext,
  ): Promise<ProductType | null> {
    return ctx.loaders.product.load(item.productId);
  }
}
```

- [ ] **Step 9.4: `ch05.module.ts`**

```typescript
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { ApolloCallCounterPlugin } from '../common/apollo-call-counter.plugin';
import { createLoaders } from './loaders';
import {
  Ch05OrderItemResolver,
  Ch05OrderResolver,
} from './resolvers/order.resolver';
import { Ch05ProductResolver } from './resolvers/product.resolver';
import { Ch05ReviewResolver } from './resolvers/review.resolver';
import { Ch05UserResolver } from './resolvers/user.resolver';
import { pubsubProvider } from './pubsub.provider';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(
        process.cwd(),
        'apps/lecture/src/ch05-client-operations/schema.gql',
      ),
      sortSchema: true,
      playground: false,
      introspection: true,
      // graphql-ws 기반 WebSocket Subscription
      subscriptions: {
        'graphql-ws': true,
      },
      context: () => ({ loaders: createLoaders() }),
    }),
  ],
  providers: [
    pubsubProvider,
    Ch05UserResolver,
    Ch05ProductResolver,
    Ch05OrderResolver,
    Ch05OrderItemResolver,
    Ch05ReviewResolver,
    ApolloCallCounterPlugin,
  ],
})
export class Ch05SubscriptionModule {}
```

- [ ] **Step 9.5: `operations/ch05/good-getProduct.graphql`**

```graphql
# Good — 명명된 쿼리, 변수 사용, 필요한 필드만 선택.
query GetProductCard($id: Int!) {
  product(id: $id) {
    id
    name
    price
  }
}
```

- [ ] **Step 9.6: `operations/ch05/anti-overfetch.graphql`**

```graphql
# Anti-pattern — 필요 없는 필드까지 모두 가져옴.
# 화면에는 name과 price만 쓰는데도 description, reviews, categories까지 fetch.
query GetProductOverfetch($id: Int!) {
  product(id: $id) {
    id
    name
    price
    stock
    description
    createdAt
    reviews {
      id
      rating
      content
      author { id name email createdAt }
    }
    categories { id name }
  }
}
```

- [ ] **Step 9.7: `operations/ch05/fragment-userCard.graphql`**

```graphql
# Fragment로 재사용 가능한 필드 선택을 정의.
# 여러 컴포넌트에서 동일한 User 카드를 그릴 때 한 곳만 수정하면 된다.
fragment UserCard on User {
  id
  name
  email
}

query GetOrderWithUserCard($id: Int!) {
  order(id: $id) {
    id
    status
    user {
      ...UserCard
    }
  }
}
```

- [ ] **Step 9.8: `operations/ch05/conditional-admin.graphql`**

```graphql
# @include / @skip 디렉티브로 조건부 필드.
# 관리자 화면에서만 email을 보여주고 싶을 때.
query GetOrderForViewer($id: Int!, $isAdmin: Boolean!) {
  order(id: $id) {
    id
    status
    totalAmount
    user {
      id
      name
      email @include(if: $isAdmin)
      createdAt @include(if: $isAdmin)
    }
  }
}
```

- [ ] **Step 9.9: `operations/ch05/subscribe-orderStatus.graphql`**

```graphql
# 폴링 없이 주문 상태 변경을 실시간 수신.
# Apollo Sandbox에서 이 구독을 시작하고
# 다른 탭에서 updateOrderStatus mutation을 호출하면 즉시 도착한다.
subscription OnOrderStatusChanged {
  orderStatusChanged {
    id
    status
    totalAmount
  }
}

mutation UpdateStatus($id: Int!, $status: OrderStatus!) {
  updateOrderStatus(id: $id, status: $status) {
    id
    status
  }
}
```

- [ ] **Step 9.10: `apps/lecture/src/ch05-client-operations/README.md`**

```markdown
# Ch05 — 클라이언트 Operation + Subscription

## 시나리오

서버 스키마는 굳어졌다. 이번엔 프론트가 좋은 쿼리를 어떻게 쓰는지 본다. 또한 주문 상태 변경을 폴링 없이 받는 Subscription을 도입한다.

## 학습 포인트 (graphql-operations 스킬 기반)

- 모든 Operation에 이름 부여 (anonymous 금지)
- 변수 사용, 인라인 값 금지
- Fragment로 재사용 + colocation
- `@include` / `@skip` 조건부 필드
- Subscription — `graphql-ws` 위 WebSocket

## 시연

```bash
pnpm start:dev
# Apollo Sandbox http://localhost:3000/graphql
```

`operations/ch05/` 안의 5개 파일을 차례로 실행. 특히 subscribe-orderStatus는:
1. 한 탭에서 `OnOrderStatusChanged` 구독 시작
2. 다른 탭에서 `UpdateStatus(id: 1, status: SHIPPED)` mutation 실행
3. 첫 탭에 즉시 메시지 도착 확인
```

- [ ] **Step 9.11: 검증**

```bash
pnpm start:dev
# Apollo Sandbox에서 Subscription 탭 사용 (수동)
```

Expected: `OnOrderStatusChanged` 구독 + 다른 탭 mutation → push 확인.

- [ ] **Step 9.12: 커밋**

```bash
git add apps/lecture/src/ch05-client-operations/ operations/ch05/
git commit -m "feat(ch05): subscriptions and client operation best practices"
```

---

## Task 10: Ch06 — Apollo Federation (3개 앱)

**Files:**
- Create: `apps/users-subgraph/{tsconfig.app.json, src/main.ts, src/app.module.ts, src/user.{model,resolver}.ts}`
- Create: `apps/orders-subgraph/{tsconfig.app.json, src/main.ts, src/app.module.ts, src/{user-ref,product,order-item,order}.{model,resolver}.ts}` (resolver는 일부)
- Create: `apps/gateway/{tsconfig.app.json, src/main.ts, src/app.module.ts}`

- [ ] **Step 10.1: `apps/users-subgraph/tsconfig.app.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/apps/users-subgraph",
    "types": ["node"]
  },
  "include": ["src/**/*", "../../libs/**/*"],
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

`apps/orders-subgraph/tsconfig.app.json`, `apps/gateway/tsconfig.app.json`도 동일한 형태로 생성 (outDir만 변경).

- [ ] **Step 10.2: `apps/users-subgraph/src/user.model.ts`**

```typescript
import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';

// users-subgraph가 User 엔티티를 소유한다.
// @key(fields: "id")로 federation key 선언 — 다른 subgraph가 id로 참조 가능.
@ObjectType('User')
@Directive('@key(fields: "id")')
export class UserType {
  @Field(() => Int)
  id!: number;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field()
  createdAt!: Date;
}
```

- [ ] **Step 10.3: `apps/users-subgraph/src/user.resolver.ts`**

```typescript
import { Args, Int, Query, ResolveReference, Resolver } from '@nestjs/graphql';
import { getStore, MockRepository, User } from '@app/mock-data';
import { UserType } from './user.model';

const userRepo = new MockRepository<User>('User', () => getStore().users);

@Resolver(() => UserType)
export class UserResolver {
  @Query(() => UserType, { nullable: true })
  async user(@Args('id', { type: () => Int }) id: number): Promise<UserType | null> {
    return (await userRepo.findOne(id)) ?? null;
  }

  @Query(() => [UserType])
  async users(): Promise<UserType[]> {
    return userRepo.findMany();
  }

  // gateway가 다른 subgraph에서 받은 User 참조를 해결할 때 호출.
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: number }): Promise<UserType | null> {
    return (await userRepo.findOne(reference.id)) ?? null;
  }
}
```

- [ ] **Step 10.4: `apps/users-subgraph/src/app.module.ts`**

```typescript
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { UserResolver } from './user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'apps/users-subgraph/src/schema.gql'),
      },
      playground: false,
      introspection: true,
    }),
  ],
  providers: [UserResolver],
})
export class AppModule {}
```

- [ ] **Step 10.5: `apps/users-subgraph/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { initStore } from '@app/mock-data';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  initStore('basic');
  const app = await NestFactory.create(AppModule);
  await app.listen(3001);
  console.log('🟢 users-subgraph: http://localhost:3001/graphql');
}
void bootstrap();
```

- [ ] **Step 10.6: `apps/orders-subgraph/src/user-ref.model.ts`**

```typescript
import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';

// orders-subgraph는 User를 "확장"만 한다 — 소유권 없음.
// 같은 키(id)를 외부 참조로 선언 — 실제 데이터는 users-subgraph에서 해결.
@ObjectType('User')
@Directive('@extends')
@Directive('@key(fields: "id")')
export class UserRefType {
  @Field(() => Int)
  @Directive('@external')
  id!: number;
}
```

- [ ] **Step 10.7: `apps/orders-subgraph/src/product.model.ts`**

```typescript
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Product')
export class ProductType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Float)
  price!: number;
}
```

- [ ] **Step 10.8: `apps/orders-subgraph/src/order-item.model.ts`**

```typescript
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ProductType } from './product.model';

@ObjectType('OrderItem')
export class OrderItemType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;

  @Field(() => ProductType)
  product!: ProductType;
}
```

- [ ] **Step 10.9: `apps/orders-subgraph/src/order.model.ts`**

```typescript
import { Field, Float, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderItemType } from './order-item.model';
import { UserRefType } from './user-ref.model';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(OrderStatusEnum, { name: 'OrderStatus' });

@ObjectType('Order')
export class OrderType {
  @Field(() => Int)
  id!: number;

  @Field(() => OrderStatusEnum)
  status!: OrderStatusEnum;

  @Field(() => Float)
  totalAmount!: number;

  @Field()
  createdAt!: Date;

  // userId는 내부 보유. user는 ResolveField에서 stub 반환 → gateway가 users-subgraph로 분배.
  @Field(() => Int)
  userId!: number;

  @Field(() => UserRefType)
  user!: UserRefType;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];
}
```

- [ ] **Step 10.10: `apps/orders-subgraph/src/order.resolver.ts`**

```typescript
import { Args, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
  getStore,
  MockRepository,
  Order,
  OrderItem,
  Product,
} from '@app/mock-data';
import { OrderItemType } from './order-item.model';
import { OrderType } from './order.model';
import { ProductType } from './product.model';
import { UserRefType } from './user-ref.model';

const orderRepo = new MockRepository<Order>('Order', () => getStore().orders);
const orderItemRepo = new MockRepository<OrderItem>('OrderItem', () => getStore().orderItems);
const productRepo = new MockRepository<Product>('Product', () => getStore().products);

@Resolver(() => OrderType)
export class OrderResolver {
  @Query(() => OrderType, { nullable: true })
  async order(@Args('id', { type: () => Int }) id: number): Promise<OrderType | null> {
    return (await orderRepo.findOne(id)) as OrderType | null;
  }

  @Query(() => [OrderType])
  async orders(): Promise<OrderType[]> {
    return (await orderRepo.findMany()) as OrderType[];
  }

  // user 필드는 단지 키(id)만 반환 — gateway가 users-subgraph에 위임
  @ResolveField(() => UserRefType)
  user(@Parent() order: OrderType): UserRefType {
    return { id: order.userId } as UserRefType;
  }

  @ResolveField(() => [OrderItemType])
  async items(@Parent() order: OrderType): Promise<OrderItemType[]> {
    const items = await orderItemRepo.findMany((it) => it.orderId === order.id);
    return items as unknown as OrderItemType[];
  }
}

@Resolver(() => OrderItemType)
export class OrderItemResolver {
  @ResolveField(() => ProductType)
  async product(@Parent() item: OrderItemType & { productId: number }): Promise<ProductType> {
    const p = await productRepo.findOne(item.productId);
    if (!p) throw new Error(`Product ${item.productId} not found`);
    return p;
  }
}
```

- [ ] **Step 10.11: `apps/orders-subgraph/src/app.module.ts`**

```typescript
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { OrderItemResolver, OrderResolver } from './order.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'apps/orders-subgraph/src/schema.gql'),
      },
      playground: false,
      introspection: true,
    }),
  ],
  providers: [OrderResolver, OrderItemResolver],
})
export class AppModule {}
```

- [ ] **Step 10.12: `apps/orders-subgraph/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { initStore } from '@app/mock-data';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  initStore('basic');
  const app = await NestFactory.create(AppModule);
  await app.listen(3002);
  console.log('🟠 orders-subgraph: http://localhost:3002/graphql');
}
void bootstrap();
```

- [ ] **Step 10.13: `apps/gateway/src/app.module.ts`**

```typescript
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      server: {
        playground: false,
        introspection: true,
      },
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'users', url: 'http://localhost:3001/graphql' },
            { name: 'orders', url: 'http://localhost:3002/graphql' },
          ],
        }),
      },
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 10.14: `apps/gateway/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('🚪 gateway: http://localhost:3000/graphql');
}
void bootstrap();
```

- [ ] **Step 10.15: 실행 검증 (3개 터미널)**

```bash
# 터미널 1
pnpm start:users
# 터미널 2
pnpm start:orders
# 터미널 3 (위 두 개가 부팅된 후)
pnpm start:gateway

# 터미널 4 — 단일 쿼리가 두 subgraph로 분배됨
curl -X POST http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ order(id:1){ id status user{ id name } items{ quantity product{ name } } } }"}'
```

Expected: 응답에 `data.order.user.name`(users-subgraph), `data.order.items[].product.name`(orders-subgraph) 모두 채워짐. 두 subgraph 콘솔 로그에 각자의 리졸버 호출 확인.

- [ ] **Step 10.16: 커밋**

```bash
git add apps/users-subgraph apps/orders-subgraph apps/gateway
git commit -m "feat(ch06): Apollo Federation with users-subgraph, orders-subgraph, gateway"
```

---

## Task 11: 루트 README + 챕터 토글 가이드

**Files:**
- Modify: `README.md`

- [ ] **Step 11.1: `README.md` 전체 교체**

```markdown
# graphql-with-nestjs — GraphQL 시나리오 학습 프로젝트

NestJS 모노레포 위에 6개 챕터의 시나리오 기반 GraphQL 학습 코드. REST의 한계 체험부터 Apollo Federation까지 점진적으로 다룬다.

> 이전에 같은 레포에서 진행한 RDB 학습 자료는 `feat/db-lecture-suite` 브랜치 / `docs/superpowers/specs/2026-04-20-db-lecture-suite-design.md` 보존.

## 빠른 시작

```bash
pnpm install
pnpm start:dev
# http://localhost:3000 — 현재 활성화된 챕터에 따라 REST 또는 GraphQL
```

`apps/lecture/src/app.module.ts`의 import 배열에서 학습 중인 챕터만 활성화.

## 챕터

| Ch | 폴더 | 주제 |
|---|---|---|
| 01 | `apps/lecture/src/ch01-rest-pain` | REST BFF 3개 — 파편화 / 모델 복제 / 언더페칭 |
| 02 | `apps/lecture/src/ch02-graphql-basics` | Code-First GraphQL — 단일 엔드포인트 |
| 03 | `apps/lecture/src/ch03-data-graph` | Field Resolver + 데이터 정규화 |
| 04 | `apps/lecture/src/ch04-n-plus-one` | DataLoader로 N+1 해결 |
| 05 | `apps/lecture/src/ch05-client-operations` | Operation 베스트 프랙티스 + Subscription |
| 06 | `apps/{users-subgraph, orders-subgraph, gateway}` | Apollo Federation |

## Ch06 실행

```bash
# 3개 터미널
pnpm start:users      # :3001
pnpm start:orders     # :3002
pnpm start:gateway    # :3000
```

## 디렉토리

```
apps/
  lecture/                # Ch01~05
  users-subgraph/         # Ch06
  orders-subgraph/        # Ch06
  gateway/                # Ch06
libs/
  mock-data/              # 공통 in-memory 스토어 + 호출 카운터
operations/               # Ch05 클라이언트 쿼리 모음
docs/superpowers/
  specs/2026-04-26-graphql-lecture-suite-design.md
  plans/2026-04-26-graphql-lecture-suite.md
```

## 학습 보조

- **호출 카운터**: 응답 헤더 `x-mock-db-calls`로 mock DB 호출 수 확인
- **결정론적 시드**: faker `seed(42)` — 매번 같은 데이터
- **Apollo Sandbox**: GraphQL 챕터에서 `http://localhost:<port>/graphql` 접속

## 노트 인사이트 매핑

설계 문서 `docs/superpowers/specs/2026-04-26-graphql-lecture-suite-design.md` 참고.
```

- [ ] **Step 11.2: 최종 빌드 검증**

```bash
pnpm build:lecture
pnpm build:users-subgraph
pnpm build:orders-subgraph
pnpm build:gateway
```

Expected: 4개 앱 모두 에러 없이 빌드, `dist/apps/*/main.js` 생성.

- [ ] **Step 11.3: 커밋**

```bash
git add README.md
git commit -m "docs: rewrite README for GraphQL lecture suite"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Ch01 BFF 3개 (Task 5)
- ✅ Ch02 Code-First (Task 6)
- ✅ Ch03 데이터 정규화 (Task 7)
- ✅ Ch04 DataLoader (Task 8)
- ✅ Ch05 Subscription + operations/ (Task 9)
- ✅ Ch06 Federation 3 apps (Task 10)
- ✅ libs/mock-data + 호출 카운터 (Task 3, 4)
- ✅ 모노레포 구성 (Task 2)
- ✅ 의존성 정리 (Task 1)
- ✅ README (Task 11)

**Placeholder scan:** TBD/TODO/"implement later" 없음.

**Type 일관성:**
- `UserType`, `ProductType`, `OrderType` 등 챕터별로 동일한 클래스명 패턴
- 챕터 격리를 위해 같은 이름의 클래스가 여러 모듈에 존재하지만 GraphQL `@ObjectType('User')`로 SDL 이름은 통일
- `OrderStatusEnum`도 챕터별로 분리되지만 `registerEnumType(.., {name:'OrderStatus'})`로 SDL은 단일

**알려진 제약:**
- 한 번에 한 챕터의 GraphQL 모듈만 활성화 가능 (스키마 충돌 방지). 챕터 전환은 `app.module.ts`에서 import 토글.
- Ch06은 별도 앱들이라 `lecture`와 동시 실행하지 않음 (포트 3000 충돌).
- AsyncLocalStorage 컨텍스트 전파는 노드 16+에서 동작.

---

## Execution Handoff

플랜 작성 완료. `auto` 모드 활성 상태이므로 곧바로 inline 실행으로 진행한다.
