# OAS Lecture Suite — FE+BE 시나리오 학습 설계서

> **For agentic workers:** 이 spec을 기반으로 `superpowers:writing-plans` 스킬로 구현 플랜을 작성하세요.

---

## Context

`db-with-nestjs` 레포의 세 번째 학습 분기. `feat/db-lecture-suite` → `feat/graphql-lecture-suite`에 이어 **OAS(OpenAPI Specification) 학습 브랜치**(`feat/oas-lecture-suite`)를 분기한다.

OpenAPI Specification은 "사후 문서"가 아니다. API의 설계를 BE/FE/QA가 동시에 참조하는 **실행 가능한 계약(Executable Contract)**이다. 그러나 이 가치는 한쪽만 보면 체감되지 않는다. FE와 BE가 함께 존재할 때, **BE 없이 FE가 돌아가고, BE 변경이 FE 타입 오류로 즉시 드러나고, 계약 위반이 CI에서 자동 검출**되는 순간에만 느껴진다.

이 프로젝트는 그 순간들을 6 챕터의 점진적 시나리오로 압축한다.

**핵심 서사**: 친숙한 Code-First(NestJS `@ApiProperty` 데코레이터)로 시작해 한계를 직접 체감한 후, Design-First(YAML이 SoT)로 전환 → Mock 병렬 개발 → Contract Testing CI 자동화까지 이르는 여정.

**이전 분기 참조**:
- RDB: `feat/db-lecture-suite` / `docs/superpowers/specs/2026-04-20-db-lecture-suite-design.md`
- GraphQL: `feat/graphql-lecture-suite` / `docs/superpowers/specs/2026-04-26-graphql-lecture-suite-design.md`

---

## 핵심 학습 목표

1. **사후 문서의 구조적 한계를 코드로 체감한다** — README의 cURL 예시가 실제 API와 어긋나는 순간, 문서 표류가 추상적 개념이 아닌 실제 버그임을 깨닫는다.
2. **Code-First는 편리하지만 SoT가 될 수 없다** — `@ApiProperty` 데코레이터로 Swagger UI를 얻을 수 있지만, FE는 여전히 BE 빌드를 기다려야 타입을 받는다.
3. **OAS YAML이 SoT가 되면 BE·FE 코드 생성이 동시에 가능해진다** — `openapi-typescript` 한 번의 codegen으로 BE DTO 타입과 FE typed client가 동시에 생성된다.
4. **Mock 서버는 BE 없이 FE를 완전히 구동시킨다** — Prism이 OAS YAML을 읽고 동적 응답을 생성하므로 FE 개발이 BE와 진정으로 병렬화된다.
5. **Contract Testing은 런타임 표류를 컴파일 타임으로 당긴다** — BE 실응답을 OAS와 비교하는 Jest 테스트가 CI에 올라가는 순간, 계약 위반은 배포 후가 아닌 PR 단계에서 차단된다.

---

## 대상 학습자

**전제 지식**:
- NestJS 기본 DI/Module/Controller 작성 경험
- TypeScript 기본 (인터페이스, 제네릭)
- REST API 개념 (메서드, 상태 코드, JSON 응답)
- React 기초 (컴포넌트, useState, fetch/axios 경험)

**GraphQL lecture suite 선행 불필요** — 독립 분기. 이커머스 도메인(User/Product/Order)은 동일하나 GraphQL 지식을 전제하지 않는다.

---

## 기술 스택

### BE (기존 모노레포 재활용)

| 패키지 | 버전 | 역할 | 챕터 |
|--------|------|------|------|
| `@nestjs/core` | ^11.x | NestJS 런타임 | 전 챕터 |
| `@nestjs/swagger` | ^8.x | Code-First OAS 생성 + Swagger UI | Ch02~ |
| `@faker-js/faker` | ^10.x | 결정론적 시드 | 전 챕터 |
| `class-validator` / `class-transformer` | 기존 | DTO 검증 | 전 챕터 |

**신규 추가 없음** — `@nestjs/swagger`만 추가.

### FE (신규 — `apps/web`)

| 패키지 | 버전 | 역할 | 챕터 |
|--------|------|------|------|
| `react` + `react-dom` | ^18.x | UI 프레임워크 | Ch02~ |
| `vite` + `@vitejs/plugin-react` | ^6.x | 빌드 도구 | Ch02~ |
| `react-router-dom` | ^6.x | 챕터 라우팅 | Ch02~ |
| `@tanstack/react-query` | ^5.x | 비동기 데이터 페칭 | Ch02~ |
| `openapi-fetch` | ^0.x | codegen 기반 typesafe fetch wrapper | Ch04~ |

### 공통 계약/도구 체인

| 도구 | 버전 | 역할 | 챕터 |
|------|------|------|------|
| `openapi-typescript` (devDep) | ^7.x | YAML → TS 타입 codegen | Ch04~ |
| `@stoplight/prism-cli` (devDep) | ^5.x | OAS 기반 Mock 서버 | Ch05~ |
| `openapi-response-validator` (devDep) | ^12.x | 응답·사양 비교 | Ch06~ |
| `js-yaml` (devDep) | ^4.x | Contract test에서 YAML 로드 | Ch06~ |

**삭제 없음** — 기존 GraphQL 의존성은 GraphQL 챕터 코드 보존을 위해 유지.

---

## 도메인 모델

GraphQL 수트와 동형. `libs/mock-data/src/domain.ts` 재활용.

```typescript
// libs/mock-data/src/domain.ts (기존 파일 재활용 — 수정 없음)
export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  description: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
}
```

Ch04부터는 `contracts/openapi.yaml`이 이 인터페이스들의 SoT가 되고, `domain.ts`는 YAML에서 codegen된 타입의 re-export로 교체된다.

---

## 프로젝트 디렉토리 구조

```
db-with-nestjs/                          # 레포 루트 (브랜치: feat/oas-lecture-suite)
├── apps/
│   ├── lecture/                         # BE — Ch01~06 토글
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts            # ← 챕터 토글 스위치 (주석/해제)
│   │       ├── common/
│   │       │   ├── call-counter.interceptor.ts   (기존 재활용)
│   │       │   └── contract-status.interceptor.ts (신규)
│   │       ├── ch01-doc-drift/
│   │       │   ├── ch01.module.ts
│   │       │   ├── products.controller.ts
│   │       │   └── users.controller.ts
│   │       ├── ch02-code-first-swagger/
│   │       │   ├── ch02.module.ts
│   │       │   ├── dto/               # @ApiProperty 데코레이터 DTO
│   │       │   └── *.controller.ts
│   │       ├── ch03-derived-spec-pain/
│   │       │   ├── ch03.module.ts
│   │       │   ├── dto/               # Ch02와 동일 + 일부러 필드 추가
│   │       │   └── *.controller.ts
│   │       ├── ch04-design-first/
│   │       │   ├── ch04.module.ts
│   │       │   ├── dto/               # contracts/generated/be-types.ts 기반
│   │       │   └── *.controller.ts
│   │       ├── ch05-parallel-blocking/
│   │       │   └── ch05.module.ts     # Ch04와 동일 BE (Prism이 mock 담당)
│   │       └── ch06-runtime-drift/
│   │           ├── ch06.module.ts
│   │           ├── dto/
│   │           └── *.controller.ts    # 의도적 응답 schema 위반 1건 포함
│   │
│   ├── web/                            # FE — Vite + React (신규)
│   │   ├── package.json               # FE 전용 (또는 루트 통합)
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── active-chapter.ts      # ACTIVE_CHAPTER = 'ch02' 등으로 토글
│   │       ├── ch02-code-first-swagger/
│   │       │   └── ProductList.tsx    # 수기 fetch (string URL + any 타입)
│   │       ├── ch03-derived-spec-pain/
│   │       │   └── ProductList.tsx    # Ch02와 동일 — 타입 안 맞아 런타임 오류
│   │       ├── ch04-design-first/
│   │       │   └── ProductList.tsx    # openapi-fetch + generated 타입 사용
│   │       ├── ch05-parallel-blocking/
│   │       │   └── ProductList.tsx    # Prism(4010) 엔드포인트로 변경
│   │       ├── ch06-runtime-drift/
│   │       │   └── ProductList.tsx    # 동일 FE + contract-debug.tsx 활성화
│   │       └── lib/
│   │           ├── api-client.ts      # openapi-fetch createClient 래퍼
│   │           └── contract-debug.tsx # x-contract-status 헤더 시각화 패널
│   │
│   ├── gateway/           (기존 GraphQL Federation — 보존)
│   ├── users-subgraph/    (기존 — 보존)
│   └── orders-subgraph/   (기존 — 보존)
│
├── libs/
│   └── mock-data/                       # 기존 재활용 (수정 없음)
│       └── src/
│           ├── domain.ts               → Ch04부터 YAML codegen re-export로 교체
│           ├── seed.ts                 faker.seed(42)
│           ├── store.ts
│           ├── mock-repository.ts
│           └── call-counter.ts
│
├── contracts/                           # 신규 (Ch04부터 등장)
│   ├── openapi.yaml                    # SoT — 수기 작성 (Ch04에서 처음 등장)
│   └── generated/                      # codegen 산출물 (.gitignore 후보)
│       ├── be-types.ts                 # openapi-typescript 출력
│       └── fe-client.ts                # openapi-fetch 타입 (동일 사양)
│
├── operations/                          # 기존 GraphQL .graphql 보존
│
├── docs/superpowers/specs/
│   └── 2026-04-27-oas-lecture-suite-design.md  ← 이 파일
│
├── package.json                         # 루트 — BE + FE 통합 또는 workspace
├── nest-cli.json                        # 변경 없음
└── tsconfig.json                        # @contracts/* path alias 추가
```

---

## 공통 학습 보조 장치

### 측정 장치: `x-contract-status` 응답 헤더

전 챕터를 단일 게이지로 가시화하는 핵심 장치. `apps/lecture/src/common/contract-status.interceptor.ts`에서 주입.

```typescript
// apps/lecture/src/common/contract-status.interceptor.ts
// 각 챕터 모듈이 자신의 ContractStatus 상수를 providers로 등록
// Interceptor가 요청마다 헤더에 주입

// Ch01: 'not-tracked'
// Ch02-03: 'code-derived'
// Ch04: 'spec-derived'
// Ch05: 'spec-derived; served-by=prism-mock'  (Prism이 직접 응답 — BE 헤더 불필요)
// Ch06: 'spec-derived; runtime-validated=ok' or '=violation'
```

**출력 형식**: `x-contract-status: spec-derived; runtime-validated=ok`

**학습 활용**: 챕터가 진행될수록 `not-tracked` → `code-derived` → `spec-derived` → `validated`로 게이지가 진화. 단 한 줄로 "지금 이 API가 얼마나 계약에 가까운가"를 표현.

**FE 측 시각화**: `apps/web/src/lib/contract-debug.tsx` — 응답 헤더를 읽어 화면 우하단에 배지로 표시 (Ch02부터 활성화).

### 결정론적 시드

`faker.seed(42)` — `libs/mock-data/src/seed.ts` 기존 코드 재활용. 재시작해도 동일 Product/User/Order 데이터.

### 챕터 토글 — BE

```typescript
// apps/lecture/src/app.module.ts
// import { Ch01DocDriftModule } from './ch01-doc-drift/ch01.module';
// import { Ch02CodeFirstSwaggerModule } from './ch02-code-first-swagger/ch02.module';
import { Ch04DesignFirstModule } from './ch04-design-first/ch04.module';

@Module({ imports: [Ch04DesignFirstModule] })
export class AppModule {}
```

### 챕터 토글 — FE

```typescript
// apps/web/src/active-chapter.ts
export const ACTIVE_CHAPTER = 'ch04'; // 변경으로 토글
// 또는: VITE_CHAPTER env 변수 사용
```

---

## 챕터 상세 설계

### Ch01: 사후 문서 표류 (`ch01-doc-drift/`)

**시나리오**: BE 개발자가 Product/User REST API를 빠르게 만든다. README에 cURL 예시를 손으로 작성한다. 두 달 후 `price` 필드가 `priceInWon`으로 바뀐다. README는 수정되지 않는다. FE 팀은 여전히 `price`를 쓰고 있다. 오류는 배포 후에야 발견된다.

**학습 목표**: "문서 표류(doc drift)는 수동 관리 구조에서 불가피한 결과다"를 코드로 체감한다.

**구현 포인트**:
- `GET /products`, `GET /products/:id`, `GET /users/:id` 세 엔드포인트 (Controller만, Swagger 없음)
- `@nestjs/swagger` 의존성 없음 — Ch02와 대비
- `x-contract-status: not-tracked` 헤더 주입
- **의도적 안티패턴**: `README.md`의 cURL 예시에 `"price": 9900` 표기. 실제 응답은 `"priceInWon": 9900`. 학습자가 `curl`로 발견하도록.

**시연**:
```bash
pnpm start:dev
# 실제 응답 확인 (priceInWon)
curl http://localhost:3000/products/1

# README 예시 (price 필드 — 어긋남)
# → 학습자가 직접 불일치 발견
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: not-tracked
```

**주석 강조점**: `// ⚠️ README의 'price' 예시와 다름. 이것이 사후 문서의 구조적 문제다.`

---

### Ch02: Code-First Swagger 도입 (`ch02-code-first-swagger/`)

**시나리오**: Ch01의 불일치를 해결하러 `@nestjs/swagger`를 도입한다. `@ApiProperty()` 데코레이터 추가. Swagger UI가 `/api`에 자동 마운트된다. FE도 처음 등장 — Swagger UI를 보고 수기로 fetch 코드를 작성한다.

**학습 목표**: "Code-First는 문서 자동화의 첫 걸음이지만, FE는 여전히 BE 빌드 후 Swagger를 보고 수기로 타입을 복사한다."

**구현 포인트**:
- `ProductDto`, `UserDto`, `OrderDto` — `@ApiProperty()` 데코레이터 완전 적용
- Swagger UI 마운트: `SwaggerModule.setup('api', app, document)`
- `x-contract-status: code-derived` 헤더
- FE `ch02-code-first-swagger/ProductList.tsx`: `fetch('http://localhost:3000/products')` + 수기 타입 정의 (`interface Product { priceInWon: number; ... }`)
- **의도적 안티패턴**: FE 수기 타입 파일에 `// TODO: BE 바뀌면 여기도 수동으로 바꿔야 함` 주석

**시연**:
```bash
pnpm start:dev
open http://localhost:3000/api   # Swagger UI 확인

# FE 실행
pnpm start:web
open http://localhost:5173        # FE에서 상품 목록 확인
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: code-derived
```

**주석 강조점**: `// ✅ 문서가 코드와 동기화되었다. 그러나 SoT는 여전히 TS 코드다.`

---

### Ch03: Code-First SoT 약점 체감 (`ch03-derived-spec-pain/`)

**시나리오**: 기획 변경으로 `Product`에 `category` 필드가 추가된다. BE 개발자가 DTO를 수정한다. OAS yaml도 재생성된다. 그러나 FE는 아무도 알려주지 않는다. FE의 수기 타입은 여전히 `category` 없음. 런타임에서야 `undefined` 오류 발생.

**학습 목표**: "Code-First에서 OAS는 산출물이지 출발점이 아니다. FE는 BE 빌드를 기다린 후에야 변경을 알 수 있다."

**구현 포인트**:
- Ch02 DTO에 `category: string` 필드 추가 (BE만 수정, FE는 그대로)
- FE `ch03-derived-spec-pain/ProductList.tsx`: Ch02 코드 그대로 복사 (타입에 `category` 없음)
- 런타임: 화면에 `category` 표시 시도 → `undefined` 렌더링
- `x-contract-status: code-derived` 동일
- `contract-debug.tsx` 패널에 "타입 미스매치 감지됨" 표시 (런타임 체크)

**시연**:
```bash
pnpm start:dev
pnpm start:web
# FE에서 카테고리 필드 undefined 확인
# BE OAS yaml 변경: pnpm run swagger:export
# FE 타입 수동 복사 시뮬레이션 (얼마나 번거로운가)
```

**주석 강조점**: `// ❌ BE가 category 추가했지만 FE는 모른다. 이것이 Code-First의 직렬 의존 문제다.`

---

### Ch04: Design-First 전환 (`ch04-design-first/`)

**시나리오**: "YAML을 먼저 작성하고 BE/FE 모두 거기서 출발하면 어떨까?" `contracts/openapi.yaml`을 팀이 함께 작성한다. `pnpm gen:types` 한 번으로 BE DTO 타입과 FE typed client가 동시에 생성된다. `category` 변경이 YAML에 반영되는 순간 양쪽 모두 컴파일 오류로 알게 된다.

**학습 목표**: "OAS YAML이 SoT가 되면 BE·FE 코드 생성이 동기화되고, 계약 변경이 컴파일 오류로 즉시 드러난다."

**구현 포인트**:
- `contracts/openapi.yaml` 작성 (Product/User/Order 스키마 + 엔드포인트)
- `scripts/gen-types.ts`: `openapi-typescript` 실행 → `contracts/generated/be-types.ts` + `fe-client.ts` 생성
- BE DTO: `contracts/generated/be-types.ts`에서 타입 import (더 이상 `@ApiProperty` 단독 작성 않음)
- FE: `openapi-fetch` `createClient<paths>` + generated types 사용
- `x-contract-status: spec-derived`

**시연**:
```bash
# YAML 수정 후 codegen
pnpm gen:types
# 타입 변경이 BE/FE 동시에 반영
pnpm start:dev
pnpm start:web
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: spec-derived
```

**주석 강조점**: `// ✅ YAML이 SoT. pnpm gen:types 한 번으로 BE·FE 타입 동시 갱신.`

---

### Ch05: Mock 서버로 BE 의존 제거 (`ch05-parallel-blocking/`)

**시나리오**: "BE가 준비되기 전에 FE를 개발하고 싶다." `prism mock contracts/openapi.yaml` 한 줄로 포트 4010에 Mock 서버가 뜬다. FE는 `baseUrl`을 4010으로 바꾸기만 하면 BE 부팅 없이 완전히 동작한다. BE가 완성되면 `baseUrl`을 3000으로 되돌린다.

**학습 목표**: "OAS YAML이 SoT가 되면 Mock 서버가 YAML을 읽어 동적 응답을 생성한다. FE와 BE 개발이 진정으로 병렬화된다."

**구현 포인트**:
- BE 코드: Ch04와 동일 (변경 없음, 선택적 활성화)
- FE `ch05-parallel-blocking/ProductList.tsx`: `VITE_API_BASE_URL` env 변수로 baseUrl 전환
  - 개발 시: `http://localhost:4010` (Prism)
  - 통합 시: `http://localhost:3000` (실 BE)
- Prism이 OAS `examples` 필드에서 동적 응답 생성
- BE 종료 후에도 FE 전체 시나리오 동작 확인

**시연**:
```bash
# BE 끄기 (아무 것도 실행하지 않음)
pnpm mock:start   # Prism 4010 포트
pnpm start:web    # FE는 4010으로 전환
open http://localhost:5173   # BE 없이 FE 완전 동작
```

**주석 강조점**: `// ✅ BE 없이 FE 동작. prism이 openapi.yaml examples로 응답 생성.`

---

### Ch06: Contract Testing — 런타임 표류 자동 검출 (`ch06-runtime-drift/`)

**시나리오**: "BE가 YAML과 다른 응답을 보내도 누가 잡아줄까?" BE `ProductController`의 응답에서 `priceInWon`을 실수로 `price`로 되돌린다. YAML은 `priceInWon`을 명시. `pnpm test:contract`를 실행하면 테스트가 즉시 fail한다. CI에 이 테스트가 올라가면 PR 단계에서 차단된다.

**학습 목표**: "Contract Testing은 BE 실응답을 OAS와 자동 비교한다. 사양 위반은 배포 후가 아닌 PR 단계에서 차단된다."

**구현 포인트**:
- BE `ch06-runtime-drift/products.controller.ts`: **의도적 위반** — `priceInWon` 대신 `price` 반환
- `test/contract/products.contract.spec.ts`:
  ```typescript
  // openapi-response-validator로 실응답 검증
  import OpenAPIResponseValidator from 'openapi-response-validator';
  import * as yaml from 'js-yaml';
  import * as fs from 'fs';

  const spec = yaml.load(fs.readFileSync('contracts/openapi.yaml', 'utf8'));
  const validator = new OpenAPIResponseValidator({ responses: spec.paths['/products/{id}'].get.responses, definitions: spec.components.schemas });
  const errors = validator.validateResponse(200, actualResponseBody);
  expect(errors).toBeNull(); // 위반 시 fail
  ```
- `x-contract-status: spec-derived; runtime-validated=violation` (위반 상태)
- **시연 흐름**: 위반 상태로 테스트 fail 확인 → `price` → `priceInWon` 수정 → 테스트 통과 → `runtime-validated=ok`

**시연**:
```bash
pnpm start:dev     # Ch06 활성화 (의도적 위반 포함)
pnpm test:contract # FAIL — price vs priceInWon 위반 검출
# 코드 수정 후
pnpm test:contract # PASS
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: spec-derived; runtime-validated=ok
```

**주석 강조점**: `// ❌ price 필드가 YAML의 priceInWon과 불일치. Contract test가 이를 잡아낸다.`

---

## 챕터 간 비교 가이드

| 챕터 | `x-contract-status` | OAS 정의 위치 | FE 타입 출처 | FE/BE 병렬? |
|------|-------------------|-------------|------------|------------|
| Ch01 | `not-tracked` | 없음 | 없음 (추측) | 불가 |
| Ch02 | `code-derived` | BE 코드(데코레이터) | 수기 복사 | 불가 |
| Ch03 | `code-derived` | BE 코드(데코레이터) | 수기 복사 (구식) | 불가 |
| Ch04 | `spec-derived` | YAML (SoT) | codegen | 불가 (BE 필요) |
| Ch05 | `spec-derived; served-by=prism-mock` | YAML (SoT) | codegen | **가능** (Prism) |
| Ch06 | `spec-derived; runtime-validated=ok` | YAML (SoT) | codegen | 가능 + CI 검증 |

---

## package.json 스크립트 추가

```json
{
  "scripts": {
    "start:web": "vite --config apps/web/vite.config.ts",
    "build:web": "vite build --config apps/web/vite.config.ts",
    "gen:types": "openapi-typescript contracts/openapi.yaml -o contracts/generated/be-types.ts",
    "mock:start": "prism mock contracts/openapi.yaml --port 4010",
    "test:contract": "jest --testPathPattern=contract"
  }
}
```

---

## tsconfig.json path alias 추가

```json
{
  "compilerOptions": {
    "paths": {
      "@app/mock-data": ["libs/mock-data/src"],
      "@app/mock-data/*": ["libs/mock-data/src/*"],
      "@contracts/*": ["contracts/*"],
      "@contracts/generated": ["contracts/generated/be-types.ts"]
    }
  }
}
```

---

## .gitignore 추가

```
contracts/generated/
apps/web/dist/
apps/web/node_modules/
```

---

## 시연 순서 (README 기반)

```bash
# 1. 설치
pnpm install

# 2. BE 챕터 활성화 (apps/lecture/src/app.module.ts에서 원하는 챕터만 주석 해제)

# 3. FE 챕터 활성화 (apps/web/src/active-chapter.ts에서 ACTIVE_CHAPTER 변경)

# 4. 실행
pnpm start:dev    # BE :3000
pnpm start:web    # FE :5173

# 5. Ch04+ codegen
pnpm gen:types

# 6. Ch05 Mock 서버
pnpm mock:start   # Prism :4010

# 7. Ch06 Contract Testing
pnpm test:contract
```

---

## 알려진 트레이드오프

1. **단일 `package.json` vs pnpm workspace**: 단일 유지. FE/BE 의존성 분리 필요 시 `apps/web/package.json` 별도 분리 가능. 본 spec은 단일 기준.
2. **Code-First 잔존**: `@nestjs/swagger`는 Ch02-03 교육용으로 남음. Ch04 이후에도 의존성 제거 안 함 — 학습자 비교용.
3. **Mock 서버 3 포트**: BE(3000)/FE(5173)/Prism(4010) — 터미널 3개 필요. README에 명시.
4. **`openapi-response-validator` vs Schemathesis**: 전자 선택. Schemathesis(Python)는 학습 범위 초과.
