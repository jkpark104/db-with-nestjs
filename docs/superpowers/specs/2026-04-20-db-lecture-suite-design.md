# DB Lecture Suite Design — 시나리오 기반 RDB 학습 프로젝트

## 개요

NestJS 기반 단일 앱에서 **TypeORM(PostgreSQL) + Prisma(MySQL)** 두 가지 ORM/DB 조합을 동시에 학습하는 시나리오 드리븐 lecture 코드 프로젝트.

이커머스(쇼핑몰) 도메인을 사용하며, 6개 챕터가 각각 하나의 비즈니스 시나리오를 통해 RDB의 기초부터 고급 최적화까지 점진적으로 다룬다.

### 핵심 학습 목표 (Notion 페이지 결론 기반)

1. 철저한 계획 기반의 마이그레이션과 쿼리 효율화
2. N+1 안티패턴 경계 및 RDBMS 고급 기능(JOIN, 인덱스, 분석 도구) 활용
3. 확장 가능하고 안정적인 백엔드 솔루션 구축 역량

### 대상

- 백엔드 초보자
- 모든 주석은 한국어, 튜토리얼 수준의 상세도

---

## 기술 스택

| 항목 | 선택 | 버전 |
|------|------|------|
| 런타임 | Node.js | 20 LTS |
| 프레임워크 | NestJS | 10.x |
| ORM 1 | TypeORM | 0.3.x |
| ORM 2 | Prisma | 6.x |
| DB 1 | PostgreSQL | 16 |
| DB 2 | MySQL | 8.4 |
| 컨테이너 | Docker Compose | v2 |
| 언어 | TypeScript | 5.x |
| 패키지 매니저 | pnpm | latest |

### 주요 의존성

```
@nestjs/core, @nestjs/common, @nestjs/platform-express
@nestjs/typeorm, typeorm, pg                    # TypeORM + PostgreSQL
@prisma/client, prisma                          # Prisma + MySQL
mysql2                                          # MySQL 드라이버
@nestjs/config                                  # 환경변수 관리
class-validator, class-transformer              # DTO 검증
@nestjs/cache-manager, cache-manager            # Ch04 캐싱
```

---

## 인프라: Docker Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: db_lecture
      POSTGRES_USER: lecture
      POSTGRES_PASSWORD: lecture1234
    volumes:
      - pg_data:/var/lib/postgresql/data

  mysql:
    image: mysql:8.4
    ports: ["3306:3306"]
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

### 환경변수 (.env)

```
# PostgreSQL (TypeORM)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=db_lecture
PG_USERNAME=lecture
PG_PASSWORD=lecture1234

# MySQL (Prisma)
MYSQL_URL="mysql://lecture:lecture1234@localhost:3306/db_lecture"
```

---

## 도메인 모델: 이커머스

```
User (고객)
├── id: number (PK, auto-increment)
├── email: string (unique)
├── name: string
├── createdAt: timestamp
├── 1:N → Order
└── 1:N → Review

Product (상품)
├── id: number (PK)
├── name: string
├── price: decimal
├── stock: number
├── description: text
├── metadata: jsonb (PG) / json (MySQL)     ← Ch06에서 활용
├── createdAt: timestamp
├── N:M ↔ Category (via ProductCategory)
├── 1:N → OrderItem
└── 1:N → Review

Category (카테고리)
├── id: number (PK)
├── name: string (unique)
└── N:M ↔ Product

ProductCategory (중간 테이블)
├── productId: number (FK)
└── categoryId: number (FK)

Order (주문)
├── id: number (PK)
├── userId: number (FK → User)
├── totalAmount: decimal
├── status: enum (PENDING, PAID, SHIPPED, DELIVERED, CANCELLED)
├── createdAt: timestamp
├── N:1 → User
└── 1:N → OrderItem

OrderItem (주문 상세)
├── id: number (PK)
├── orderId: number (FK → Order)
├── productId: number (FK → Product)
├── quantity: number
├── unitPrice: decimal
├── N:1 → Order
└── N:1 → Product

Review (리뷰)
├── id: number (PK)
├── userId: number (FK → User)
├── productId: number (FK → Product)
├── rating: number (1-5)
├── content: text
├── createdAt: timestamp
├── N:1 → User
└── N:1 → Product
```

---

## 프로젝트 디렉토리 구조

```
db-with-nestjs/
├── docker-compose.yml
├── .env
├── package.json
├── tsconfig.json
├── nest-cli.json
├── prisma/
│   └── schema.prisma                          # Prisma 스키마 (MySQL)
├── src/
│   ├── app.module.ts                          # 루트 모듈: TypeORM + Prisma 연결
│   ├── main.ts
│   ├── common/
│   │   ├── prisma/
│   │   │   └── prisma.service.ts              # PrismaClient 래퍼
│   │   └── seed/
│   │       ├── seed.ts                        # 공통 시드 진입점
│   │       ├── seed-basic.ts                  # Ch01~02용 소량 시드
│   │       └── seed-bulk.ts                   # Ch03~04용 대량 시드
│   │
│   ├── ch01-shop-open/                        # 쇼핑몰 오픈
│   │   ├── ch01.module.ts
│   │   ├── typeorm/
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── product.entity.ts
│   │   │   ├── ch01-typeorm.service.ts
│   │   │   └── ch01-typeorm.controller.ts
│   │   └── prisma/
│   │       ├── ch01-prisma.service.ts
│   │       └── ch01-prisma.controller.ts
│   │
│   ├── ch02-catalog/                          # 상품 카탈로그 구축
│   │   ├── ch02.module.ts
│   │   ├── typeorm/
│   │   │   ├── entities/
│   │   │   │   ├── category.entity.ts
│   │   │   │   ├── product-category.entity.ts
│   │   │   │   ├── order.entity.ts
│   │   │   │   ├── order-item.entity.ts
│   │   │   │   └── review.entity.ts
│   │   │   ├── ch02-typeorm.service.ts
│   │   │   └── ch02-typeorm.controller.ts
│   │   └── prisma/
│   │       ├── ch02-prisma.service.ts
│   │       └── ch02-prisma.controller.ts
│   │
│   ├── ch03-order-crisis/                     # 주문 폭주! 장애 발생
│   │   ├── ch03.module.ts
│   │   ├── typeorm/
│   │   │   ├── ch03-typeorm.service.ts        # N+1 시연 + 해결
│   │   │   └── ch03-typeorm.controller.ts
│   │   └── prisma/
│   │       ├── ch03-prisma.service.ts
│   │       └── ch03-prisma.controller.ts
│   │
│   ├── ch04-black-friday/                     # 블랙프라이데이 대비
│   │   ├── ch04.module.ts
│   │   ├── typeorm/
│   │   │   ├── ch04-typeorm.service.ts        # 인덱스, EXPLAIN, 캐싱
│   │   │   └── ch04-typeorm.controller.ts
│   │   └── prisma/
│   │       ├── ch04-prisma.service.ts
│   │       └── ch04-prisma.controller.ts
│   │
│   ├── ch05-system-renewal/                   # 시스템 리뉴얼
│   │   ├── ch05.module.ts
│   │   ├── typeorm/
│   │   │   ├── migrations/                    # TypeORM 마이그레이션 파일
│   │   │   └── ch05-typeorm.service.ts
│   │   └── prisma/
│   │       ├── migrations/                    # Prisma 마이그레이션 (참고용 사본)
│   │       └── ch05-prisma.service.ts
│   │
│   └── ch06-analytics/                        # 매출 분석 대시보드
│       ├── ch06.module.ts
│       ├── typeorm/
│       │   ├── ch06-typeorm.service.ts        # 집계, 트랜잭션, JSONB
│       │   └── ch06-typeorm.controller.ts
│       └── prisma/
│           ├── ch06-prisma.service.ts
│           └── ch06-prisma.controller.ts
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-20-db-lecture-suite-design.md
└── README.md
```

---

## 챕터 상세 설계

---

### Ch01. "쇼핑몰 오픈" — DB 연결 & 엔티티 기초

**시나리오**: 새 이커머스 서비스를 런칭하며 첫 데이터베이스를 구축한다.

**학습 목표**:
- Docker로 PostgreSQL/MySQL 실행하기
- NestJS에서 TypeORM/Prisma로 DB 연결 설정
- 테이블, 열, 행의 개념을 코드로 이해
- 기본 키(PK)와 데이터 타입 매핑

**TypeORM (PostgreSQL) 구현**:
- `TypeOrmModule.forRootAsync()` 설정 (ConfigService 연동)
- `User` 엔티티: `@Entity()`, `@PrimaryGeneratedColumn()`, `@Column()` 데코레이터
- `Product` 엔티티: 다양한 컬럼 타입 (varchar, decimal, text, timestamp)
- 간단한 CRUD 엔드포인트 (유저 생성, 상품 등록)

**Prisma (MySQL) 구현**:
- `schema.prisma` 작성: datasource, generator, model 블록
- `PrismaService` (OnModuleInit, OnModuleDestroy 라이프사이클)
- User, Product 모델 정의
- 동일한 CRUD 엔드포인트

**주석에서 다룰 핵심 개념**:
- "테이블 = 엔티티 클래스" 대응 관계
- PK의 역할: 왜 모든 테이블에 고유 식별자가 필요한가
- PG와 MySQL의 기본 차이: 포트, 인증, 기본 스키마 구조
- `synchronize: true`는 개발에서만 — 프로덕션에서는 마이그레이션 (Ch05 예고)

**API 엔드포인트**:
- `POST /ch01/typeorm/users` — 유저 생성 (PG)
- `GET /ch01/typeorm/users` — 유저 목록 (PG)
- `POST /ch01/typeorm/products` — 상품 등록 (PG)
- `POST /ch01/prisma/users` — 유저 생성 (MySQL)
- `GET /ch01/prisma/users` — 유저 목록 (MySQL)
- `POST /ch01/prisma/products` — 상품 등록 (MySQL)

---

### Ch02. "상품 카탈로그 구축" — 관계 매핑 & CRUD

**시나리오**: 카테고리, 주문, 리뷰 시스템을 추가하며 엔티티 간 관계를 설계한다.

**학습 목표**:
- 외래 키(FK)의 개념과 역할
- 1:N, N:M, 1:1 관계를 ORM으로 매핑
- 기본 CRUD 작업의 패턴
- Query Builder 기초 사용법
- 뷰(View)의 개념 소개

**TypeORM (PostgreSQL) 구현**:
- `Category`, `ProductCategory`, `Order`, `OrderItem`, `Review` 엔티티 추가
- 관계 데코레이터: `@OneToMany`, `@ManyToOne`, `@ManyToMany`, `@JoinTable`
- `Repository` 패턴으로 CRUD
- `createQueryBuilder()` 기초: WHERE, ORDER BY, LIMIT
- `@ViewEntity()`로 "인기 상품 뷰" 생성

**Prisma (MySQL) 구현**:
- schema.prisma에 모든 모델 + relation 필드 추가
- `prisma generate` 후 타입 안전한 CRUD
- `include`, `select`로 관계 데이터 조회
- Fluent API 체이닝
- `$queryRaw`로 뷰 조회

**주석에서 다룰 핵심 개념**:
- FK가 테이블을 "연결"하는 원리
- N:M 관계에서 중간 테이블이 필요한 이유
- cascade 옵션의 의미와 주의점
- TypeORM Repository vs Prisma Client API 비교

**API 엔드포인트**:
- `POST /ch02/typeorm/categories` — 카테고리 생성
- `POST /ch02/typeorm/products/:id/categories` — 상품-카테고리 연결 (N:M)
- `POST /ch02/typeorm/orders` — 주문 생성 (OrderItem 포함)
- `GET /ch02/typeorm/products/:id/reviews` — 상품 리뷰 조회
- `GET /ch02/typeorm/popular-products` — 인기 상품 뷰 조회
- (prisma/ 경로로 동일 엔드포인트)

---

### Ch03. "주문 폭주! 장애 발생" — N+1 문제 시연 & 해결

**시나리오**: 주문이 급증하며 "전체 주문 목록 + 상세" API 응답이 5초 이상 걸린다. 쿼리 로그를 추적해 원인을 찾고 단계적으로 해결한다.

**학습 목표**:
- N+1 문제가 무엇인지 직접 체험
- 네트워크 레이턴시 누적이 성능에 미치는 영향 이해
- Eager Loading vs Lazy Loading
- JOIN을 활용한 해결
- 배치 페칭과 데이터 구조 재설계

**TypeORM (PostgreSQL) 구현**:

Phase 1 — 문제 시연:
- `logging: true`로 쿼리 로그 활성화
- 주문 목록 조회 → 각 주문의 OrderItem → 각 OrderItem의 Product를 루프로 조회
- 콘솔에 출력되는 쿼리 수 카운트 (1 + N + N*M)
- 응답 시간 측정 미들웨어

Phase 2 — Eager Loading 해결:
- `relations: ['orderItems', 'orderItems.product']` 옵션
- 쿼리 수 변화 확인

Phase 3 — JOIN 해결:
- `createQueryBuilder('order').leftJoinAndSelect(...)` 체이닝
- 단일 쿼리로 모든 데이터 가져오기
- 쿼리 수: 1개

Phase 4 — 배치 페칭:
- 주문 ID 목록 → `whereInIds()`로 일괄 조회
- GROUP BY로 집계 데이터 한 번에 가져오기

**Prisma (MySQL) 구현**:

Phase 1 — 문제 시연:
- `$on('query')` 이벤트로 쿼리 로깅
- findMany 후 루프에서 별도 findUnique 호출

Phase 2 — include 해결:
- `include: { orderItems: { include: { product: true } } }`

Phase 3 — 선택적 필드 로딩:
- `select`로 필요한 필드만 가져오기

Phase 4 — Raw JOIN:
- `$queryRaw`로 JOIN 쿼리 직접 실행

**주석에서 다룰 핵심 개념**:
- "1개의 목록 쿼리 + N개의 상세 쿼리 = N+1" 공식
- 네트워크 왕복(RTT) 비용: 로컬 DB vs 원격 DB의 차이
- ORM의 지연 로딩이 편리하지만 위험한 이유
- JOIN이 N+1보다 약 10배 이상 빠른 이유 (Notion 페이지 인용)
- 각 Phase별 쿼리 수와 실행 시간 비교표 (주석 내 표)

**API 엔드포인트**:
- `GET /ch03/typeorm/orders/naive` — N+1 발생 버전
- `GET /ch03/typeorm/orders/eager` — Eager Loading 버전
- `GET /ch03/typeorm/orders/join` — JOIN 버전
- `GET /ch03/typeorm/orders/batch` — 배치 페칭 버전
- (prisma/ 경로로 동일 패턴)

**시드 데이터**: User 100명, Product 500개, Order 2,000건, OrderItem 8,000건

---

### Ch04. "블랙프라이데이 대비" — 인덱스 & 쿼리 최적화

**시나리오**: 대규모 트래픽을 앞두고 느린 쿼리를 찾아내고, 인덱스와 쿼리 튜닝으로 성능을 개선한다.

**학습 목표**:
- 인덱스의 원리 (B-Tree 구조)
- 단일/복합/유니크 인덱스 생성
- EXPLAIN ANALYZE (PG) / EXPLAIN (MySQL)로 실행 계획 분석
- Query Builder 고급 사용법 (서브쿼리, 조건부 JOIN, 페이지네이션)
- 풀텍스트 검색
- NestJS 캐싱 전략

**TypeORM (PostgreSQL) 구현**:

Part 1 — 인덱스 없이 조회 (before):
- 50,000개 상품에서 가격 범위 검색
- 주문 내역에서 날짜 범위 + 상태 필터
- EXPLAIN ANALYZE 결과 확인 → Seq Scan 확인

Part 2 — 인덱스 적용 (after):
- `@Index('idx_product_price')` 단일 인덱스
- `@Index('idx_order_date_status', ['createdAt', 'status'])` 복합 인덱스
- `@Index({ unique: true })` 유니크 인덱스
- EXPLAIN ANALYZE 재실행 → Index Scan 확인
- 실행 시간 비교 (주석 내 before/after 표)

Part 3 — Query Builder 고급:
- 서브쿼리: "평균 가격 이상인 상품 조회"
- 조건부 JOIN: 특정 카테고리 상품만 리뷰와 함께 조회
- 커서 기반 페이지네이션 vs OFFSET 페이지네이션

Part 4 — 풀텍스트 검색:
- PG: `tsvector` 컬럼, `GIN` 인덱스, `to_tsquery()` 검색
- 상품명/설명에서 키워드 검색

Part 5 — 캐싱:
- `@nestjs/cache-manager`로 자주 조회되는 상품 목록 캐싱
- TTL 설정, 캐시 무효화 패턴

**Prisma (MySQL) 구현**:

Part 1~2 — 인덱스:
- `@@index([price])`, `@@index([createdAt, status])`
- `$queryRaw(Prisma.sql\`EXPLAIN ...\`)` 로 실행 계획 확인

Part 3 — 고급 쿼리:
- cursor 기반 페이지네이션 (`cursor`, `skip`, `take`)
- `$queryRaw`로 서브쿼리

Part 4 — 풀텍스트:
- MySQL `FULLTEXT` 인덱스, `MATCH ... AGAINST` 구문

**주석에서 다룰 핵심 개념**:
- B-Tree 인덱스가 "전화번호부"처럼 작동하는 원리
- 인덱스가 쓰기 성능에 미치는 트레이드오프
- Seq Scan vs Index Scan 읽는 법
- OFFSET의 성능 문제와 커서 페이지네이션이 대안인 이유
- PG tsvector vs MySQL FULLTEXT 차이

**API 엔드포인트**:
- `GET /ch04/typeorm/products/search?minPrice=&maxPrice=` — 가격 범위 검색
- `GET /ch04/typeorm/products/explain` — EXPLAIN ANALYZE 결과 반환
- `GET /ch04/typeorm/orders/filter?from=&to=&status=` — 복합 필터
- `GET /ch04/typeorm/products/cursor?cursor=&limit=` — 커서 페이지네이션
- `GET /ch04/typeorm/products/fulltext?q=` — 풀텍스트 검색
- `GET /ch04/typeorm/products/cached` — 캐싱된 상품 목록
- (prisma/ 경로로 동일)

**시드 데이터**: Product 50,000개, Order 100,000건 (대량)

---

### Ch05. "시스템 리뉴얼" — 마이그레이션 전략

**시나리오**: 서비스 확장에 따라 스키마를 변경(컬럼 추가, 타입 변경)하고, 기존 데이터를 안전하게 이전한다.

**학습 목표**:
- 스키마 마이그레이션의 개념과 필요성
- TypeORM migration vs Prisma migrate 워크플로우
- 데이터 마이그레이션 (기존 데이터 변환)
- 빅뱅 / 트리클 / 제로 다운타임 전략 이해
- 롤백 처리
- 프로덕션 배포 시 주의사항

**TypeORM (PostgreSQL) 구현**:

Step 1 — 마이그레이션 생성:
- `typeorm migration:generate` 명령으로 자동 생성
- 생성된 SQL 파일 분석 (ALTER TABLE)

Step 2 — 스키마 변경 시나리오:
- `Product`에 `discountRate: decimal` 컬럼 추가
- `Order.status`를 string에서 enum으로 변경
- `User`에 `phone: string (nullable)` 추가

Step 3 — 데이터 마이그레이션:
- 마이그레이션 파일 내 `up()`에서 기존 데이터 변환 SQL 작성
- 예: 기존 주문의 status 값을 새 enum에 맞게 매핑

Step 4 — 롤백:
- `migration:revert`로 롤백 시연
- `down()` 메서드의 역할

**Prisma (MySQL) 구현**:

Step 1 — `prisma migrate dev`:
- schema.prisma 수정 → `prisma migrate dev --name add-discount-rate`
- 생성된 마이그레이션 SQL 파일 확인

Step 2 — 동일 스키마 변경 시나리오

Step 3 — 커스텀 데이터 마이그레이션:
- 마이그레이션 SQL 파일에 직접 UPDATE 문 추가

Step 4 — 롤백:
- `prisma migrate resolve`로 실패 마이그레이션 처리

**주석에서 다룰 핵심 개념**:
- `synchronize: true`가 프로덕션에서 위험한 이유 (데이터 손실 가능성)
- 마이그레이션 = "DB 스키마의 버전 관리" (git처럼)
- 빅뱅: 한 번에 전환, 다운타임 필수 — 소규모 시스템에 적합
- 트리클: 점진적 전송, 병행 운영 — 중규모 시스템
- 제로 다운타임: expand-contract 패턴 — 대규모 시스템
- "항상 롤백 계획을 먼저 세워라"

**API 엔드포인트**:
- 이 챕터는 API보다 CLI 명령 중심
- `GET /ch05/typeorm/migration-status` — 현재 마이그레이션 상태 조회
- `GET /ch05/prisma/migration-status` — Prisma 마이그레이션 상태 조회

---

### Ch06. "매출 분석 대시보드" — 집계, 트랜잭션, 고급 기능

**시나리오**: 경영진을 위한 매출 분석 기능과 안전한 결제 처리 시스템을 구현한다.

**학습 목표**:
- GROUP BY, HAVING, 서브쿼리로 집계
- 윈도우 함수 (ROW_NUMBER, RANK)
- 트랜잭션 관리와 원자성 보장
- 동시성 제어: 비관적 락 / 낙관적 락
- 저장 프로시저 생성 및 호출
- JSONB (PG) vs JSON (MySQL)
- MVCC 이해

**TypeORM (PostgreSQL) 구현**:

Part 1 — 집계 쿼리:
- 월별 매출 합계: GROUP BY + SUM
- 카테고리별 평균 상품 가격: GROUP BY + AVG + HAVING
- 매출 TOP 10 상품: 서브쿼리 + ORDER BY

Part 2 — 윈도우 함수:
- 상품 매출 랭킹: `ROW_NUMBER() OVER (ORDER BY total DESC)`
- 카테고리 내 랭킹: `RANK() OVER (PARTITION BY category_id ORDER BY ...)`

Part 3 — 트랜잭션:
- 주문 처리: 재고 차감 + 주문 생성 + 결제 기록을 하나의 트랜잭션
- `DataSource.transaction(manager => { ... })`
- `QueryRunner` 수동 트랜잭션 제어

Part 4 — 동시성 제어:
- 비관적 락: `setLock('pessimistic_write')` — 동시 재고 차감 방지
- 낙관적 락: `@VersionColumn()` — 충돌 감지

Part 5 — 저장 프로시저:
- PG 함수 생성: `CREATE OR REPLACE FUNCTION calculate_monthly_revenue(...)`
- NestJS에서 호출: `query('SELECT * FROM calculate_monthly_revenue($1)', [month])`

Part 6 — JSONB:
- Product.metadata에 JSONB로 상품 속성 저장 (색상, 크기 등)
- JSONB 쿼리: `->`, `->>`, `@>` 연산자
- GIN 인덱스로 JSONB 검색 최적화

**Prisma (MySQL) 구현**:

Part 1~2 — 집계 + 윈도우:
- `prisma.order.groupBy({ by: ['status'], _sum: { totalAmount: true } })`
- 윈도우 함수: `$queryRaw` 사용

Part 3 — 트랜잭션:
- `prisma.$transaction([query1, query2, ...])` (배치)
- `prisma.$transaction(async (tx) => { ... })` (인터랙티브)

Part 4 — 동시성:
- `$queryRaw\`SELECT ... FOR UPDATE\``

Part 5 — 저장 프로시저:
- MySQL 프로시저 생성: `CREATE PROCEDURE`
- `$queryRaw\`CALL calculate_monthly_revenue(?)\``

Part 6 — JSON:
- MySQL JSON 타입 저장/조회
- `JSON_EXTRACT()`, `JSON_CONTAINS()` 함수
- PG JSONB와의 차이 (주석에서 비교)

**주석에서 다룰 핵심 개념**:
- 트랜잭션의 ACID 속성과 "전부 성공 아니면 전부 실패"
- 비관적 락 vs 낙관적 락: 언제 어떤 것을 쓸지
- MVCC: PG는 모든 트랜잭션, MySQL은 InnoDB에서만
- JSONB가 NoSQL 같은 유연성을 RDB 안에서 제공하는 방법
- 저장 프로시저: 장점(성능)과 단점(유지보수) 트레이드오프

**API 엔드포인트**:
- `GET /ch06/typeorm/analytics/monthly-revenue` — 월별 매출
- `GET /ch06/typeorm/analytics/top-products` — 매출 TOP 10
- `GET /ch06/typeorm/analytics/category-ranking` — 카테고리별 랭킹
- `POST /ch06/typeorm/orders/checkout` — 트랜잭션 결제 처리
- `POST /ch06/typeorm/orders/concurrent-checkout` — 동시성 제어 시연
- `GET /ch06/typeorm/products/by-metadata?color=red` — JSONB 검색
- (prisma/ 경로로 동일)

---

## 시드 데이터 전략

| 용도 | 데이터 규모 | 사용 챕터 |
|------|-----------|----------|
| seed-basic | User 10, Product 30, Category 5, Order 20, OrderItem 60, Review 50 | Ch01, Ch02 |
| seed-bulk | User 100, Product 50,000, Category 20, Order 100,000, OrderItem 400,000, Review 10,000 | Ch03, Ch04, Ch06 |

시드 스크립트는 `faker` 라이브러리를 사용하여 현실적인 데이터를 생성한다.
TypeORM과 Prisma 각각에 대해 시드를 실행할 수 있도록 별도 명령 제공:

```bash
# 소량 시드 (Ch01~02 학습용)
pnpm seed:basic

# 대량 시드 (Ch03~06 성능 체감용)
pnpm seed:bulk
```

---

## 학습 토픽 완전성 검증

### Notion 페이지 원본 토픽 → 챕터 매핑

| Notion 페이지 토픽 | 챕터 | 커버 여부 |
|-------------------|------|----------|
| 테이블, 열, 행, PK, FK | Ch01 + Ch02 | ✅ |
| 트랜잭션 일관성 | Ch06 Part 3 | ✅ |
| 인덱싱 | Ch04 Part 1~2 | ✅ |
| 저장 프로시저 & 뷰 | Ch02 (뷰) + Ch06 Part 5 (프로시저) | ✅ |
| 동시성 제어 (Locking) | Ch06 Part 4 | ✅ |
| PostgreSQL 지배력 / PG vs MySQL | 전체 (양쪽 비교) | ✅ |
| 스키마/데이터/스토리지/클라우드 마이그레이션 | Ch05 | ✅ |
| 빅뱅/트리클/제로 다운타임 전략 | Ch05 주석 | ✅ |
| N+1 문제 정의 | Ch03 Phase 1 | ✅ |
| ORM 지연 로딩 원인 | Ch03 Phase 1 주석 | ✅ |
| 네트워크 레이턴시 누적 | Ch03 주석 | ✅ |
| JOIN 활용 | Ch03 Phase 3 | ✅ |
| 즉시 로딩 (Eager Loading) | Ch03 Phase 2 | ✅ |
| 배치 페칭 | Ch03 Phase 4 | ✅ |
| 데이터 구조 재설계 (GROUP BY) | Ch03 Phase 4 + Ch06 Part 1 | ✅ |
| 캐싱 | Ch04 Part 5 | ✅ |

### 점진학습(A) 토픽 → 챕터 매핑

| A 토픽 | B 챕터 | 커버 여부 |
|--------|--------|----------|
| DB 연결 기초 | Ch01 | ✅ |
| 엔티티/스키마, PK/FK | Ch01 + Ch02 | ✅ |
| 1:1, 1:N, N:M 관계 | Ch02 | ✅ |
| 기본 CRUD | Ch02 | ✅ |
| Query Builder 기초 | Ch02 | ✅ |
| Query Builder 고급 | Ch04 Part 3 | ✅ |
| 마이그레이션 전략 | Ch05 | ✅ |
| N+1 시연 & 해결 | Ch03 | ✅ |
| 인덱스, EXPLAIN ANALYZE | Ch04 Part 1~2 | ✅ |
| 집계 (GROUP BY, HAVING) | Ch06 Part 1 | ✅ |
| 서브쿼리 | Ch04 Part 3 + Ch06 Part 1 | ✅ |
| JSONB / JSON | Ch06 Part 6 | ✅ |
| 트랜잭션 | Ch06 Part 3 | ✅ |
| 동시성 제어 | Ch06 Part 4 | ✅ |
| 윈도우 함수 | Ch06 Part 2 | ✅ |
| 풀텍스트 검색 | Ch04 Part 4 | ✅ |
| 캐싱 전략 | Ch04 Part 5 | ✅ |
| 저장 프로시저 & 뷰 | Ch02 + Ch06 | ✅ |

모든 토픽 커버 완료 — 빠진 항목 없음.
