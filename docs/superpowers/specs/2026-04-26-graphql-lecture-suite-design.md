# GraphQL Lecture Suite Design — 시나리오 기반 GraphQL 학습 프로젝트

## Context — 왜 이 프로젝트인가

이 레포는 본래 RDB 학습 프로젝트(`feat/db-lecture-suite`, `2026-04-20-db-lecture-suite-design.md`)였으나, **학습 토픽별로 브랜치를 분기**하는 구조로 전환한다. 본 spec은 그 첫 분기 — **GraphQL 학습 브랜치** 의 설계서다.

학습자의 GraphQL 강의 노트(2026-04-26)에는 다음 인사이트가 정리되어 있다.

1. REST 리소스 중심 설계의 한계 — BFF 파편화, 데이터 모델 복제, 변경 전파 실패
2. GraphQL의 답 — 단일 그래프, 강타입 시스템, 클라이언트 지정 응답, 자기 문서화
3. **데이터 정규화** — 동일 데이터를 한 곳에 정의하고 참조로 연결 (예: `Order.user → User`로 `userName` 중복 제거)
4. **Federation** — 도메인을 subgraph로 나눠 supergraph로 합성, 팀별 소유권과 단일 모델을 동시에 달성

이 프로젝트는 위 인사이트를 **추상 설명이 아닌 동작하는 코드와 시연**으로 체감시키는 데 목적이 있다. DB 수트와 동일한 패턴(6 챕터, 시나리오 드리븐, 한국어 튜토리얼 주석, 백엔드 초보자 대상)을 유지한다.

### 핵심 학습 목표

1. REST의 구조적 한계를 직접 코드와 측정값으로 체감
2. GraphQL의 데이터 그래프 설계 — Code-First 스키마, 정규화된 참조, Field Resolver
3. 리졸버 N+1 문제와 DataLoader 해결책
4. 클라이언트 측 GraphQL Operation 작성법 (graphql-operations 스킬 적용)
5. Apollo Federation으로 분산 도메인을 단일 그래프로 통합

### 대상

- 백엔드 초보자 (DB 수트 학습자와 동일 페르소나)
- 모든 주석은 한국어, 튜토리얼 수준의 상세도

---

## 기술 스택

| 항목 | 선택 | 비고 |
|---|---|---|
| 런타임 | Node.js 20 LTS | |
| 프레임워크 | NestJS 11 | 모노레포 모드 (`apps/`) |
| 언어 | TypeScript 5.x | |
| GraphQL 드라이버 | `@nestjs/apollo` + `@apollo/server` | |
| 스키마 정의 | Code-First | `@ObjectType`, `@Field`, `@Resolver` 데코레이터 |
| 데이터 저장 | **in-memory mock store** | DB 의존성 제거; mock latency + 호출 카운터로 N+1 가시화 |
| Subscription | `graphql-ws` (WebSocket) | Ch05 |
| Federation | `@apollo/subgraph` + `@apollo/gateway` | Ch06 |
| 배칭 | `dataloader` | Ch04 |
| 패키지 매니저 | pnpm | 기존 유지 |
| 클라이언트 데모 | `operations/*.graphql` + Apollo Sandbox | Ch05 중심 |

### 의존성 변경 요약

**삭제** (DB 수트 잔재):
```
@nestjs/typeorm, typeorm, pg, mysql2, mariadb,
@prisma/client, prisma, @prisma/adapter-mariadb,
@nestjs/cache-manager, cache-manager
```

**삭제 파일**:
```
src/ch01-shop-open/ ~ src/ch06-analytics/
src/common/prisma/, src/common/seed/
prisma/, prisma.config.ts, docker-compose.yml, .env (DB용)
```

**보존**: `docs/superpowers/specs/2026-04-20-db-lecture-suite-design.md` (이전 학습 자료)

**추가**:
```
@nestjs/graphql, @nestjs/apollo, @apollo/server, graphql,
graphql-ws, ws,
@apollo/subgraph, @apollo/gateway,
dataloader
```

---

## 도메인 모델 — 이커머스 (DB 수트와 동형)

```
User       : id, email, name, createdAt
Product    : id, name, price, stock, description, createdAt
Category   : id, name
Order      : id, userId, status (PENDING|PAID|SHIPPED|DELIVERED|CANCELLED), totalAmount, createdAt
OrderItem  : id, orderId, productId, quantity, unitPrice
Review     : id, userId, productId, rating, content, createdAt
```

**관계**:
- User 1:N Order, User 1:N Review
- Order 1:N OrderItem, OrderItem N:1 Product
- Product N:M Category, Product 1:N Review

DB 수트의 ERD를 그대로 in-memory 객체 배열로 옮긴다. 시드는 `libs/mock-data/seed.ts`에서 `@faker-js/faker`로 생성.

---

## 프로젝트 디렉토리 구조

```
graphql-with-nestjs/                    # 레포 루트 (이름은 그대로 db-with-nestjs 유지 가능)
├── package.json                        # NestJS 모노레포 설정
├── nest-cli.json                       # apps/ 등록
├── tsconfig.json
├── tsconfig.build.json
│
├── apps/
│   ├── lecture/                        # Ch01–Ch05 학습 메인 앱 (포트 3000)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── ch01-rest-pain/         # REST의 한계
│   │   │   ├── ch02-graphql-basics/    # GraphQL 첫 도입
│   │   │   ├── ch03-data-graph/        # 그래프 설계 + 정규화
│   │   │   ├── ch04-n-plus-one/        # 리졸버 N+1 + DataLoader
│   │   │   └── ch05-client-operations/ # 클라이언트 쿼리 + Subscription
│   │   └── tsconfig.app.json
│   │
│   ├── users-subgraph/                 # Ch06: User 도메인 (포트 3001)
│   │   └── src/{main.ts, app.module.ts, user.{module,resolver,model}.ts}
│   │
│   ├── orders-subgraph/                # Ch06: Order/Product/Review 도메인 (포트 3002)
│   │   └── src/{main.ts, app.module.ts, order.{module,resolver,model}.ts, product.*, review.*}
│   │
│   └── gateway/                        # Ch06: Apollo Gateway (포트 3000은 Ch06 모드 시 lecture와 분리)
│       └── src/{main.ts, app.module.ts}
│
├── libs/
│   └── mock-data/                      # 공통 인메모리 데이터 + 유틸
│       └── src/
│           ├── index.ts                # 진입점 (export *)
│           ├── seed.ts                 # 시드 데이터 생성 (faker)
│           ├── store.ts                # 도메인별 메모리 저장소
│           ├── mock-repository.ts      # CRUD + 의도적 latency + 호출 카운터
│           └── call-counter.ts         # 글로벌 호출 카운터 (request-scoped)
│
├── operations/                         # Ch05에서 사용할 클라이언트 쿼리 모음
│   ├── ch02/{getProducts.graphql, createOrder.graphql, ...}
│   ├── ch03/{getOrderWithUser.graphql, ...}
│   ├── ch04/{listOrdersWithItems.graphql, ...}
│   └── ch05/{fragments.graphql, subscriptions.graphql, conditional.graphql}
│
├── docs/
│   └── superpowers/
│       └── specs/
│           ├── 2026-04-20-db-lecture-suite-design.md   # 보존
│           └── 2026-04-26-graphql-lecture-suite-design.md
│
└── README.md
```

### 모노레포 구성 메모

- `nest-cli.json`의 `projects` 항목에 4개 앱(`lecture`, `users-subgraph`, `orders-subgraph`, `gateway`) 등록
- `libs/mock-data`는 path alias `@app/mock-data`로 모든 앱이 공유
- 포트 배분:
  - `lecture` → 3000 (Ch01–05 학습 중 실행)
  - `users-subgraph` → 3001 (Ch06 전용)
  - `orders-subgraph` → 3002 (Ch06 전용)
  - `gateway` → 3000 (Ch06 전용; `lecture` 앱과 동시 실행 안 함)
- 실행 명령:
  ```bash
  pnpm start:dev lecture           # Ch01–05: 단독 실행
  # --- Ch06 시작 시 lecture 종료 후 ---
  pnpm start:dev users-subgraph    # Ch06 subgraph A
  pnpm start:dev orders-subgraph   # Ch06 subgraph B
  pnpm start:dev gateway           # Ch06 gateway (3000)
  ```

---

## 공통 학습 보조 장치

### 1. Mock Repository + 호출 카운터

`libs/mock-data/mock-repository.ts`는 모든 도메인에서 재사용되는 in-memory CRUD 클래스.

```typescript
export class MockRepository<T extends { id: number }> {
  // 의도적 latency — 실제 DB 호출처럼 보이게 함
  private readonly latencyMs = 5;
  // request-scoped 카운터에 증가시켜 N+1 시연에 사용
  async findOne(id: number): Promise<T | undefined> {
    CallCounter.increment(this.entityName);
    await sleep(this.latencyMs);
    return this.store.find(...);
  }
  async findMany(ids?: number[]): Promise<T[]> { ... }
}
```

- `CallCounter`는 NestJS Interceptor로 request-scoped 초기화
- 응답 헤더 `x-mock-db-calls: User=12, Product=24, Order=1` 형태로 노출
- Ch04에서 DataLoader 적용 전/후 헤더 값을 비교하면 효과가 즉시 보임

### 2. 챕터 README

각 `apps/lecture/src/chXX-*/README.md`에 다음을 기록:
- 시나리오 한국어 설명
- 핵심 학습 포인트 체크리스트
- 시연 명령 (curl/Apollo Sandbox 쿼리 예시)
- 주의 사항 / 다음 챕터 연결고리

### 3. operations/ 디렉토리

- `graphql-operations` 스킬 규칙(명명, 변수, fragment, directive)을 따른 예제 모음
- Ch05에서 본격적으로 활용; Ch02–Ch04 시연 시에도 참조

---

## 챕터 상세 설계

---

### Ch01. "REST로 만든 첫 쇼핑몰" — REST의 한계 체험

**시나리오**: 새 이커머스 서비스를 REST로 시작했는데, Web/Mobile/Admin 세 클라이언트의 요구가 달라 BFF가 3개로 갈라졌다. 운영 6개월 차에 `User.name → fullName`으로 바꿔야 하는데, 어떤 BFF가 영향받는지 추적이 어렵다.

**학습 목표**:
- 리소스 중심 REST 설계 체감
- BFF 파편화 — 같은 `User`가 3가지 모양으로 응답되는 현상
- 오버페칭(불필요한 필드) / 언더페칭(여러 호출 조합 필요)
- 화면 하나를 그리기 위해 N개 엔드포인트 호출이 필요한 비용

**구현**:
- `ch01-rest-pain/`
  - `web-bff/` — 상품 상세 페이지: `/web/products/:id`, `/web/products/:id/reviews`, `/web/users/:id` 따로 호출
  - `mobile-bff/` — 모바일 홈: `/mobile/products`(가격/이미지만), `/mobile/orders/me`
  - `admin-bff/` — 관리자: `/admin/users` (모든 필드 + 통계)
- 동일 도메인 데이터를 BFF별로 다르게 변환 → 모델 복제 발생
- `User.name → fullName` 변경 시뮬레이션 주석으로 영향 범위 시연

**측정**:
- "상품 상세 페이지" 화면 로드 시 발생하는 HTTP 호출 수와 총 응답 바이트 수를 콘솔에 출력
- `x-mock-db-calls` 헤더로 mock DB 호출 수 확인

**API 엔드포인트 예시** (각 BFF별):
- `GET /web/products/:id`, `GET /web/products/:id/reviews`, `GET /web/users/:id`
- `GET /mobile/products`, `GET /mobile/orders/me`
- `GET /admin/users`, `GET /admin/products/:id`

**주석에서 강조할 것**: 이 챕터의 "고통"이 다음 챕터에서 GraphQL이 해결할 정확히 그 문제다.

---

### Ch02. "GraphQL 첫 도입" — 단일 엔드포인트와 클라이언트 지정 응답

**시나리오**: Ch01 도메인을 그대로 GraphQL로 다시 노출한다. `/graphql` 하나로 Web/Mobile/Admin 모두 자기 화면에 필요한 모양 그대로 받아간다.

**학습 목표**:
- Code-First Schema 정의 (`@ObjectType`, `@Field`)
- Query / Mutation 기본 (`@Resolver`, `@Query`, `@Mutation`)
- 클라이언트 지정 응답 — 같은 엔드포인트가 요청에 따라 다른 모양 반환
- Schema Introspection — Apollo Sandbox에서 스키마 자동 탐색
- 강타입 검증 — 잘못된 쿼리는 실행 전 거부

**구현**:
- `ch02-graphql-basics/`
  - `models/{user,product,order}.model.ts` — `@ObjectType` 데코레이터로 GraphQL 타입 선언
  - `resolvers/{user,product,order}.resolver.ts` — 기본 Query/Mutation
  - `app.module.ts`에 `GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: ... })`
- 동일 화면 데이터를 Ch01보다 적은 호출로 가져오는 비교 데모 (operations/ch02/storefrontPage.graphql)

**시연 쿼리 (operations/ch02/)**:
```graphql
query StorefrontPage {
  product(id: 1) { id name price reviews { rating content } }
}
```
→ Ch01에서는 3개 REST 호출이 필요했던 것이 한 쿼리로.

**주석에서 강조할 것**:
- `!`(NonNull), `[T]`, `[T!]!`의 의미
- `autoSchemaFile`로 자동 생성되는 `schema.gql` 파일 살펴보기 — Code-First가 결국 SDL을 만들어내는 과정

---

### Ch03. "데이터 그래프 설계 + 정규화" — Field Resolver와 참조

**시나리오**: 주문(Order)에 사용자 이름까지 응답하던 Ch02 구조를 정리한다. `Order` 타입은 `userName`을 갖지 않는다 — 대신 `Order.user: User` 참조만 갖고, 클라이언트가 `user { name }`을 명시할 때만 User Resolver가 호출된다.

**학습 목표** (노트 4번 완전 흡수):
- 데이터 정규화 — 한 곳에 정의, 다른 곳은 참조
- Field Resolver 분리 — `@ResolveField`로 관계 필드 별도 해결
- ID 기반 참조 모델 — `Order.userId`만 저장, `user`는 resolver가 lookup
- 프론트 캐시 정규화 개념 (Apollo Client) — 주석으로 소개

**구현**:
- `ch03-data-graph/`
  - `models/order.model.ts` — `@Field(() => User) user`만 선언, `userName` 같은 평탄화 필드는 없음
  - `resolvers/order.resolver.ts` — Order 자체 쿼리 + `@ResolveField('user')` 별도 메서드
  - `resolvers/product.resolver.ts` — `@ResolveField('reviews')`, `@ResolveField('categories')`
- "Order.user.name → fullName 변경" 시뮬레이션 — `User` 한 곳만 고쳐도 Order 응답에 자동 반영됨을 시연

**시연 쿼리**:
```graphql
query OrderDetail($id: ID!) {
  order(id: $id) {
    id status totalAmount
    user { id name }                # User Field Resolver가 호출됨
    items { quantity product { name price } }
  }
}
```

**주석에서 강조할 것**:
- REST에서는 `userName`을 모든 응답에 복제했다 → 변경이 전파되지 않음
- GraphQL에서는 User 정의 한 곳만 진실의 원천 (single source of truth)
- 이 구조가 Ch04의 N+1 문제를 만들어낸다 (각 Order마다 User Resolver 호출)

---

### Ch04. "리졸버에서 또 N+1?" — DataLoader로 배치하기

**시나리오**: 주문 목록(20개) 화면에서 Field Resolver가 User를 20번, Product를 60번 조회한다. `x-mock-db-calls` 헤더를 보니 100회가 넘는다. DB 수트 Ch03의 N+1이 GraphQL 리졸버 레이어에서 다른 모습으로 재등장했다.

**학습 목표**:
- 리졸버 레벨 N+1의 발생 원리
- DataLoader 패턴 — 같은 tick 내 키들을 모아 한 번에 batch fetch
- per-request 인스턴스 — 요청 격리, 캐시 누수 방지
- NestJS에서 DataLoader 통합 패턴

**구현**:
- `ch04-n-plus-one/`
  - Phase 1 — 그대로 시연: Ch03 구조 + 시드 늘려서 호출 카운트 측정
  - Phase 2 — DataLoader 도입: `userLoader.ts`, `productLoader.ts` (`new DataLoader(keys => repo.findMany(keys))`)
  - Phase 3 — NestJS Context 통합: `GraphQLModule.forRoot({ context: ({ req }) => ({ loaders: createLoaders() }) })` → resolver에서 `@Context() ctx`로 접근
  - Phase 4 — 호출 카운트 비교 표 (주석으로 정리)

**측정**:
| Phase | User 호출 | Product 호출 | 총 |
|---|---|---|---|
| 1 (naïve) | 20 | 60+ | 100+ |
| 2 (DataLoader) | 1 | 1 | ~3 |

**주석에서 강조할 것**:
- DataLoader는 ORM의 "include"와 다른 결 — 리졸버 분리 구조를 깨지 않으면서 배칭
- 캐시는 per-request만 — 응답 간 데이터 stale 방지
- REST BFF가 화면별로 데이터를 미리 합치던 일과 비교

---

### Ch05. "프론트가 쓰는 쿼리" — 클라이언트 Operation과 실시간 구독

**시나리오**: 백엔드 스키마는 굳어졌다. 이제 프론트엔드 관점에서 좋은 쿼리를 쓰는 법을 배운다. 그리고 주문 상태 변경을 폴링 없이 받기 위해 Subscription을 도입한다.

**학습 목표** (graphql-operations 스킬 적용):
- Operation 명명 — 모든 쿼리/뮤테이션에 이름 부여
- 변수 사용 — 인라인 값 금지
- Fragment — 재사용 + 컴포넌트 단위 colocation 개념
- Directive — `@include(if:)`, `@skip(if:)` 활용
- Subscription — `graphql-ws` 위 WebSocket 기반 실시간 데이터

**구현**:
- `ch05-client-operations/`
  - 서버: `OrderResolver`에 `@Subscription('orderStatusChanged')` 추가, `PubSub` 인스턴스로 mutation에서 publish
  - 클라이언트: `operations/ch05/` 안에 좋은 예제와 안티패턴 비교
    - `getProductBasic.graphql` (good: named, variable, no overfetch)
    - `getProductOverfetch.graphql` (anti: 모든 필드 가져오기)
    - `userCardFragment.graphql` (good: fragment 정의 + 사용)
    - `conditionalAdminFields.graphql` (good: `@include(if: $isAdmin)`)
    - `subscribeOrderStatus.graphql` (Subscription)
  - 각 `.graphql`에 한국어 주석으로 좋은/나쁜 이유 설명

**시연**:
- Apollo Sandbox에서 Subscription 탭으로 `orderStatusChanged` 구독
- 다른 창에서 `updateOrderStatus` mutation 실행 → 즉시 push 확인

**주석에서 강조할 것**:
- 백엔드 스키마는 고정되어도 클라이언트 쿼리 품질은 개발자 책임
- Fragment colocation이 프론트 컴포넌트 구조와 일치할 때 가치가 큼

---

### Ch06. "팀별 도메인 분리" — Apollo Federation

**시나리오**: 회사가 커지며 회원팀과 주문팀이 나뉘었다. 각 팀이 자기 도메인 subgraph를 소유하고, gateway가 단일 supergraph로 합쳐 클라이언트에는 여전히 `/graphql` 하나로 노출한다.

**학습 목표**:
- subgraph / supergraph 개념
- `@key`, `@external`, `@requires`, `@provides` 디렉티브
- Entity 확장 — `User`는 users-subgraph 소유, orders-subgraph는 `extend type User @key(fields: "id")`로 참조만
- 쿼리 플래닝 — gateway가 쿼리를 분해해 subgraph로 분배
- 변경 전파 — User 스키마 변경이 자동으로 supergraph에 반영

**구현**:
- `apps/users-subgraph/` (포트 3001)
  - `User` 타입 소유: `@Directive('@key(fields: "id")')`
  - Query: `me`, `user(id)`, `users`
- `apps/orders-subgraph/` (포트 3002)
  - `Order`, `OrderItem`, `Product`, `Review` 소유
  - `@Directive('@extends')` `User` — `userId`로 참조만, name은 owner subgraph에서 해결
  - Query: `order(id)`, `orders`, `product(id)`
- `apps/gateway/` (포트 3000)
  - `IntrospectAndCompose`로 두 subgraph 등록
  - 단일 `/graphql` 엔드포인트
- 시연 쿼리:
  ```graphql
  query OrderWithOwnerName($id: ID!) {
    order(id: $id) {
      id status
      user { id name }      # 이 user.name은 users-subgraph가 해결
      items { product { name } }
    }
  }
  ```

**측정**:
- 두 subgraph 콘솔 로그를 동시에 켜고 단일 쿼리가 어떻게 분산되는지 관찰
- `User.name → fullName` 변경 시 users-subgraph만 수정해도 supergraph 전체에 전파됨을 시연

**주석에서 강조할 것**:
- Federation은 "데이터 모델 단일성"을 분산 환경에서도 유지하는 메커니즘
- Schema Stitching과의 차이 — Federation은 subgraph가 자기 의도를 디렉티브로 선언
- Ch01에서 본 BFF 모델 복제 문제를 조직 규모에서도 해결하는 방법

**API 엔드포인트**:
- 학습자는 항상 `http://localhost:3000/graphql` (gateway) 만 쳐다봄
- subgraph 직접 접속(`:3001/graphql`, `:3002/graphql`)은 디버깅용

---

## 시드 데이터 전략

| 용도 | 규모 | 사용 챕터 |
|---|---|---|
| basic seed | User 10, Product 30, Category 5, Order 20, OrderItem 60, Review 50 | Ch01–Ch03 |
| medium seed | User 50, Product 200, Order 200, OrderItem 800, Review 500 | Ch04 (N+1 효과 가시화) |

- `libs/mock-data/seed.ts`에서 `@faker-js/faker`로 결정론적 시드(고정 seed) 생성
- 앱 부팅 시 1회 메모리에 로딩, 재시작 시 초기화
- Federation 챕터에서는 users-subgraph와 orders-subgraph가 같은 시드 함수를 공유 (`User.id` 일치 보장)

---

## 노트 인사이트 → 챕터 매핑 검증

| 노트 인사이트 | 챕터 | 커버 |
|---|---|---|
| REST 리소스 중심 설계 | Ch01 | ✅ |
| BFF 파편화 (Web/Mobile/Admin) | Ch01 | ✅ |
| 데이터 모델 복제 (User × 3) | Ch01 → Ch02 비교 | ✅ |
| 변경 전파 실패 (`name → fullName`) | Ch01 + Ch03 + Ch06 | ✅ |
| 단일 엔드포인트 | Ch02 | ✅ |
| 오버/언더페칭 해결 | Ch01(체감) → Ch02(해결) | ✅ |
| 강타입 시스템 | Ch02 + Ch03 | ✅ |
| 클라이언트 지정 응답 | Ch02 + Ch05 | ✅ |
| Introspection / 자기 문서화 | Ch02 (Apollo Sandbox) | ✅ |
| 제품 중심 설계 | Ch02 + Ch05 (operations/) | ✅ |
| 계층 구조 (UI = 쿼리) | Ch02 + Ch05 | ✅ |
| Type, Field, `!`, Query/Mutation | Ch02 | ✅ |
| 실시간 구독 (Subscription) | Ch05 | ✅ |
| **데이터 정규화 (참조 기반)** | **Ch03** | ✅ |
| **Federation (supergraph)** | **Ch06** | ✅ |
| (보너스) N+1 in resolver | Ch04 | ✅ |
| (보너스) DataLoader | Ch04 | ✅ |
| (보너스) Operation 베스트 프랙티스 | Ch05 | ✅ |

모든 노트 인사이트 + graphql-operations 스킬 + N+1 보너스 커버.

---

## 재사용할 기존 자산

- `package.json`의 `pnpm` 스크립트 패턴 (`start`, `start:dev`, `lint`, `format`)
- `eslint.config.mjs`, `tsconfig.json` 기본 설정
- `@faker-js/faker`(devDependency 유지)
- `class-validator` / `class-transformer`(GraphQL Input 검증에서도 동일하게 활용)
- `nest-cli.json` (모노레포 모드로 확장)

---

## 검증 (Verification)

각 챕터별 종단간(end-to-end) 검증 절차:

### Ch01
```bash
pnpm start:dev lecture
curl http://localhost:3000/web/products/1
curl http://localhost:3000/web/products/1/reviews
curl http://localhost:3000/web/users/1
# 응답 헤더 x-mock-db-calls와 호출 횟수 확인
```

### Ch02
- `http://localhost:3000/graphql`(Apollo Sandbox)에서 `operations/ch02/storefrontPage.graphql` 실행
- Schema 탭에서 자동 생성된 SDL 확인
- Ch01 동일 화면 데이터를 단일 호출로 받았음을 응답 헤더로 비교

### Ch03
- `OrderDetail` 쿼리 실행 → `user`/`items.product` 모두 채워짐
- `User` 모델의 `name` 필드 한 곳만 수정 → Order 응답에서도 즉시 반영됨을 확인

### Ch04
- 같은 `listOrdersWithItems` 쿼리를 Phase 1/2 에서 실행 → `x-mock-db-calls` 헤더 비교
- Phase 2 헤더가 한 자릿수가 되어야 합격

### Ch05
- Apollo Sandbox Subscription 탭에서 `orderStatusChanged` 구독 시작
- 별도 탭에서 `updateOrderStatus` mutation 호출 → 구독 탭에 즉시 메시지 도착 확인
- `operations/ch05/`의 anti-pattern 쿼리는 ESLint 또는 주석으로 "왜 나쁜지" 표시

### Ch06
```bash
# 터미널 3개에서 각각
pnpm start:dev users-subgraph    # :3001
pnpm start:dev orders-subgraph   # :3002
pnpm start:dev gateway           # :3000

# Apollo Sandbox http://localhost:3000/graphql
query { order(id: "1") { id user { name } items { product { name } } } }
```
- 두 subgraph 콘솔에 각각의 리졸버 호출 로그가 찍히는지 확인
- gateway 로그에 query plan이 출력되는지 확인 (`@apollo/gateway` debug 옵션)

### 전체
```bash
pnpm lint
pnpm build           # 모든 apps/*가 빌드되는지
```

---

## 작업 순서 요약 (구현 단계 사전 메모)

1. 브랜치 생성: `git checkout -b feat/graphql-lecture-suite`
2. DB 수트 잔재 삭제 (위 "삭제 파일" 목록)
3. NestJS 모노레포 변환 — `nest-cli.json` 수정, `apps/lecture` 스캐폴드
4. `libs/mock-data` 구현 (시드 + MockRepository + CallCounter)
5. Ch01 → Ch02 → Ch03 → Ch04 → Ch05 순차 구현
6. Ch06용 추가 앱 3개 스캐폴드 + Federation 구성
7. `operations/` 디렉토리에 클라이언트 쿼리 정리
8. README 갱신 (DB 수트와 GraphQL 수트 둘 다 안내)

상세 step-by-step 실행 계획은 별도 implementation plan으로 작성한다.
