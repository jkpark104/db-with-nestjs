# OAS Lecture Suite — FE+BE 시나리오 학습 설계서

> **For agentic workers:** 이 spec을 기반으로 `superpowers:writing-plans` 스킬로 구현 플랜을 작성하세요.

---

## Context

`db-with-nestjs` 레포의 세 번째 학습 분기. `feat/db-lecture-suite` → `feat/graphql-lecture-suite`에 이어 **OAS(OpenAPI Specification) 학습 브랜치**(`feat/oas-lecture-suite`)를 분기한다.

OpenAPI Specification은 "사후 문서"가 아니다. API의 설계를 BE/FE/QA가 동시에 참조하는 **실행 가능한 계약(Executable Contract)**이다. 그러나 이 가치는 한쪽만 보면 체감되지 않는다. FE와 BE가 함께 존재할 때, **BE 없이 FE가 돌아가고, BE 변경이 FE 타입 오류로 즉시 드러나고, 계약 위반이 CI에서 자동 검출**되는 순간에만 느껴진다.

이 프로젝트는 그 순간들을 8 챕터의 점진적 시나리오로 압축한다.

**핵심 서사**: 친숙한 Code-First(NestJS `@ApiProperty` 데코레이터)로 시작해 한계를 직접 체감한 후, Design-First(YAML이 SoT)로 전환 → Mock 병렬 개발 → Contract Testing CI 자동화까지 이르는 여정.

**이전 분기 참조**:
- RDB: `feat/db-lecture-suite` / `docs/superpowers/specs/2026-04-20-db-lecture-suite-design.md`
- GraphQL: `feat/graphql-lecture-suite` / `docs/superpowers/specs/2026-04-26-graphql-lecture-suite-design.md`

---

## Contract Invariants (전 챕터 공통 계약 기준)

학습 시나리오 전반에서 흔들리지 않아야 하는 명명·구조 표준. 챕터에 따라 *의도적으로 위반*되어 학습 포인트를 만든다(Ch01의 README 예시, Ch06의 응답 위반 등). 단, 도메인 모델·YAML SoT·codegen 산출물의 정의는 항상 이 표준을 따른다.

| 필드/규칙 | 표준값 | 비고 |
|----------|-------|------|
| 가격 필드명 | `priceInWon` (정수, KRW 원 단위) | Ch01 README는 의도적으로 `price`로 어긋남. Ch06 BE는 의도적으로 `price`로 회귀 |
| 시간 필드명 | `createdAt` (ISO 8601 문자열) | YAML schema에서 `format: date-time` |
| ID 필드 | `number` (정수, 양수) | UUID 미사용 — 학습 단순화 |
| 통화 단위 | KRW 원, 정수 | 소수점/통화 변환 미고려 |
| 응답 헤더 | `x-contract-status` (Ch07부터 `client=` suffix, Ch08부터 `compat=` suffix 추가) | 챕터별 값만 변동 — [측정 장치](#측정-장치-x-contract-status-응답-헤더) 참조 |
| OAS 버전 | OpenAPI 3.1 | JSON Schema 2020-12 슈퍼셋 — `examples` 활용 |

이 표는 모든 챕터의 "정상 응답"에 대한 단일 진실의 원천이다. 학습 코드가 이를 벗어날 때는 반드시 챕터 본문에 *의도적 위반*임을 명시한다.

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
| `@nestjs/swagger` | ^11.x | Code-First OAS 생성 + Swagger UI (NestJS 11 호환은 v11+) | Ch02~ |
| `@faker-js/faker` | ^10.x | 결정론적 시드 | 전 챕터 |
| `class-validator` / `class-transformer` | 기존 | DTO 검증 | 전 챕터 |

**BE 측 신규 의존성**: `@nestjs/swagger`만 추가. 그 외 NestJS 11 / `class-validator` / `@faker-js/faker`는 기존 모노레포에서 그대로 재활용한다.

### FE (신규 — `apps/web`)

| 패키지 | 버전 | 역할 | 챕터 |
|--------|------|------|------|
| `react` + `react-dom` | ^18.x | UI 프레임워크 | Ch02~ |
| `vite` + `@vitejs/plugin-react` | ^7.x (또는 최신 LTS) | 빌드 도구 | Ch02~ |
| `react-router-dom` | ^7.x (v6 호환 모드 가능) | 챕터 라우팅 | Ch02~ |
| `@tanstack/react-query` | ^5.x | 비동기 데이터 페칭 | Ch02~ |
| `openapi-fetch` | ^0.17 이상 | codegen 기반 typesafe fetch wrapper | Ch04~ |
| `openapi-react-query` | ^0.5 이상 | TanStack Labs — paths 기반 useQuery/useMutation 자동 생성 | Ch07~ |

### 공통 계약/도구 체인

| 도구 | 버전 | 역할 | 챕터 |
|------|------|------|------|
| `openapi-typescript` (devDep) | ^7.x | YAML → TS 타입 codegen | Ch04~ |
| `@stoplight/prism-cli` (devDep) | ^5.x | OAS 기반 Mock 서버 | Ch05~ |
| `openapi-response-validator` (devDep) | ^12.x | 응답·사양 비교 | Ch06~ |
| `js-yaml` (devDep) | ^4.x | Contract test에서 YAML 로드 | Ch06~ |
| `oasdiff` (CLI, Tufin) | 1.x | OAS 두 버전 비교 — backward-incompatible 변경 차단 | Ch08~ |

**삭제 없음** — 기존 GraphQL 의존성은 GraphQL 챕터 코드 보존을 위해 유지.

---

## 도메인 모델

GraphQL 수트와 동형. `libs/mock-data/src/domain.ts`를 본 OAS 분기에서 **수정하여 재활용**한다.

```typescript
// libs/mock-data/src/domain.ts (Ch01~Ch03: 직접 정의)
export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  priceInWon: number;       // ← Contract Invariant: 가격은 priceInWon (KRW, 정수)
  stock: number;
  description: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalAmountInWon: number; // ← KRW 정수, priceInWon과 일관
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPriceInWon: number;
}
```

**`domain.ts` 수정 정책 (챕터 진화)**:
- **Ch01~Ch03**: 위 형태의 **수기 정의** 유지. `priceInWon` 등 표준 사용.
- **Ch04 이후**: `contracts/openapi.yaml`이 SoT가 되며, `domain.ts`는 다음과 같이 codegen 타입의 **re-export 모듈**로 교체:

```typescript
// libs/mock-data/src/domain.ts (Ch04+: re-export)
import type { components } from '../../../contracts/generated/be-types';

export type User       = components['schemas']['User'];
export type Product    = components['schemas']['Product'];
export type Order      = components['schemas']['Order'];
export type OrderStatus= components['schemas']['OrderStatus'];
export type OrderItem  = components['schemas']['OrderItem'];
```

이 전환은 Ch04 챕터 시연의 일부다 — "어느 순간 SoT가 코드에서 YAML로 옮겨가는가"를 학습자가 직접 경험.

> 학습 시 BE/FE 모두 `libs/mock-data/src/domain.ts`만 import한다. Ch04 전환 후에도 import 경로는 동일 — *내부 구현만 re-export로 바뀐다*. 이로써 Ch01-03 코드는 Ch04 진입 시 import 변경 없이 컴파일된다.

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
│   └── mock-data/                       # 기존 재활용 — domain.ts만 수정
│       └── src/
│           ├── domain.ts               # Ch01-03: priceInWon 표준으로 직접 정의
│           │                           # Ch04+: contracts/generated/be-types.ts re-export
│           ├── seed.ts                 # 기존 faker.seed(42)
│           ├── store.ts                # 기존
│           ├── mock-repository.ts      # 기존
│           └── call-counter.ts         # 기존
│
├── contracts/                           # 신규 (Ch04부터 등장)
│   ├── openapi.yaml                    # SoT — 수기 작성 (Ch04에서 처음 등장)
│   └── generated/                      # codegen 산출물 (.gitignore 처리)
│       └── be-types.ts                 # openapi-typescript 단일 산출물
│                                       # (BE/FE 양쪽 동일 파일을 import)
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

**FE의 응답 헤더 검출 방법**:
- React Query의 `meta`/`onSuccess` 또는 `openapi-fetch` 응답의 `response.headers.get('x-contract-status')`로 추출
- 추출한 값을 React Context로 broadcast → `<ContractDebugBadge>` 컴포넌트가 우하단에 표시
- Ch05 (Prism 모드)는 BE 헤더가 없으므로, FE는 **`baseUrl` 호스트가 4010이면** `served-by=prism-mock`을 *클라이언트에서 합성*해 표시 (실제 헤더 부재를 학습자에게 명시)
- Ch03/Ch06 의 "타입/응답 미스매치 감지"는 다음 두 단계 검출:
  1. **컴파일 타임**: TypeScript 타입 차이 (Ch04+ codegen 적용 후 구조적 비교)
  2. **런타임**: FE에서 `Object.keys(response)` 와 spec 기반 키 셋을 비교, 차이를 패널에 빨간색으로 표시

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

### CORS / Base URL 정책

| 챕터 | BE 포트 | FE 포트 | Mock 포트 | FE `baseUrl` (Vite env) | BE CORS origin |
|------|---------|---------|----------|------------------------|---------------|
| Ch01 | 3000 | — (FE 없음) | — | — | — |
| Ch02-04, Ch06 | 3000 | 5173 | — | `http://localhost:3000` | `http://localhost:5173` |
| Ch05 | 3000 (선택, 꺼도 됨) | 5173 | 4010 | `http://localhost:4010` (Prism) | (BE 켜면) `http://localhost:5173` |

`apps/lecture/src/main.ts`에서 `app.enableCors({ origin: 'http://localhost:5173', exposedHeaders: ['x-contract-status'] })` 설정. `exposedHeaders` 누락 시 FE에서 `x-contract-status` 헤더를 읽지 못하므로 필수.

FE는 `apps/web/.env` (또는 `.env.<chapter>`)에 `VITE_API_BASE_URL`을 정의. `active-chapter.ts`가 `import.meta.env.VITE_API_BASE_URL`을 통해 baseUrl을 결정.

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
# 실제 응답 확인 (priceInWon — Contract Invariant 표준)
curl http://localhost:3000/products/1
# {"id":1,"name":"...","priceInWon":9900,"stock":...}

# README의 cURL 예시는 일부러 'price'로 어긋나게 둔다
# → 학습자가 직접 불일치를 손으로 발견
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: not-tracked
```

**Done-Definition (Ch01)**:
- `curl http://localhost:3000/products/1`이 200을 반환하고 `priceInWon` 필드 포함
- 응답 헤더 `x-contract-status: not-tracked`
- README의 cURL 예시는 `price` 표기 (의도적 표류)
- `apps/lecture/src/ch01-doc-drift/`에 OAS 관련 의존(`@nestjs/swagger`) **사용 없음**

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

# OAS YAML 추출 (Code-First 산출물)
pnpm swagger:export             # → contracts/openapi.from-code.yaml 생성

# FE 실행
pnpm start:web
open http://localhost:5173        # FE에서 상품 목록 확인
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: code-derived
```

**Done-Definition (Ch02)**:
- `http://localhost:3000/api` Swagger UI에서 `Product`/`User` 스키마 확인
- 응답 헤더 `x-contract-status: code-derived`
- `pnpm swagger:export` 실행 후 `contracts/openapi.from-code.yaml`이 `priceInWon` 필드 포함
- FE는 수기 정의된 `interface Product { priceInWon: number; ... }`로 fetch — 컴파일 가능, 런타임 정상

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
# 1) FE 화면: category 컬럼이 빈 셀(undefined) 렌더링
# 2) BE OAS yaml 갱신: pnpm swagger:export
# 3) 학습자가 손으로 FE 타입 복사 — 번거로움 체감
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: code-derived
```

**Done-Definition (Ch03)**:
- BE 응답 JSON에 `category` 필드 포함
- FE 화면에 `category`가 `undefined`로 렌더링 (또는 `contract-debug` 패널이 빨간색 미스매치 알림)
- `pnpm swagger:export`로 yaml 갱신은 가능하나 **FE 타입 자동 동기화는 불가능**임을 학습자가 확인
- 응답 헤더 `x-contract-status: code-derived`

**주석 강조점**: `// ❌ BE가 category 추가했지만 FE는 모른다. 이것이 Code-First의 직렬 의존 문제다.`

---

### Ch04: Design-First 전환 (`ch04-design-first/`)

**시나리오**: "YAML을 먼저 작성하고 BE/FE 모두 거기서 출발하면 어떨까?" `contracts/openapi.yaml`을 팀이 함께 작성한다. `pnpm gen:types` 한 번으로 BE DTO 타입과 FE typed client가 동시에 생성된다. `category` 변경이 YAML에 반영되는 순간 양쪽 모두 컴파일 오류로 알게 된다.

**학습 목표**: "OAS YAML이 SoT가 되면 BE·FE 코드 생성이 동기화되고, 계약 변경이 컴파일 오류로 즉시 드러난다."

**구현 포인트**:
- `contracts/openapi.yaml` 작성 (Product/User/Order 스키마 + 엔드포인트, OpenAPI 3.1)
- 단일 codegen 명령 `pnpm gen:types` → `contracts/generated/be-types.ts` 한 파일 생성 (`openapi-typescript`)
- BE DTO: `be-types.ts`의 `components['schemas']['Product']` 타입을 직접 import. `@ApiProperty` 데코레이터는 **더 이상 신규 추가하지 않음** — 기존 Ch02-03 의존성은 학습 비교를 위해 남겨둠
- FE: `openapi-fetch`의 `createClient<paths>()` + 같은 `be-types.ts` 의 `paths` 타입 import
- `libs/mock-data/src/domain.ts`를 codegen re-export 형태로 교체 (위 [도메인 모델](#도메인-모델) 참조)
- `prebuild`/`pretest` 훅에서 `gen:types` 자동 실행 — `contracts/generated/`가 .gitignore이므로 빌드 전 항상 재생성
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

**Done-Definition (Ch04)**:
- `contracts/openapi.yaml` 존재, `info.version`/`paths`/`components.schemas` 정의
- `pnpm gen:types` 실행 후 `contracts/generated/be-types.ts` 생성 + `priceInWon` 등 표준 필드 포함
- BE/FE 양쪽이 같은 `be-types.ts`를 import — `Product` 타입 정의가 어느 한 곳에서만 변경되어도 양쪽 빌드가 동시 실패
- `pnpm build` 통과 (BE), `pnpm build:web` 통과 (FE)

**런타임 검증의 한계 (학습 포인트)**:

`openapi-typescript`는 **TypeScript 타입만** 생성한다 — 런타임에 존재하지 않는다. 따라서 NestJS의 `ValidationPipe`(클래스 + 데코레이터 기반)가 직접 동작하지 않는다. 본 챕터는 다음 절충안을 채택:

| 검증 위치 | 방법 | 비고 |
|----------|------|------|
| **요청 본문/쿼리** | 컨트롤러에서 AJV로 `components.schemas` 직접 검증 (`ajv.compile(spec.components.schemas.Product)`) | 또는 학습 단순화를 위해 Ch04에선 검증 생략하고 Ch05 Prism이 422를 대신 보여주도록 위임 |
| **응답 본문** | Ch06 contract test가 `openapi-response-validator`로 검증 | 런타임이 아닌 테스트 시점 |
| **Code-First 비교** | `class-validator` + `@ApiProperty`는 Ch02-03 한정 | Ch04+에선 데코레이터 신규 작성 금지 (트레이드오프 #2) |

> **학습 포인트**: 타입 codegen은 런타임 검증을 *주지 않는다*. SoT YAML이 있어도 검증은 별도 도구(AJV/Prism/contract test) 조합이 필요하다는 사실을 Ch04에서 명시한다.

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
- Prism의 응답 생성 정책 (Prism 공식 문서 기준):
  - **기본(static) 모드**: OAS `examples` 우선 사용 → 없으면 schema의 `default`/`format`/`type` 으로 정적 값 생성
  - **동적 모드 (`prism mock -d`)**: JSON Schema Faker로 매 요청마다 다른 값 생성. 학습 시연에서는 옵션으로 소개
  - 본 챕터는 정적 모드를 기본으로 하되, `contracts/openapi.yaml` 의 `examples` 필드로 시연용 데이터 고정
- **Prism은 사용자 정의 헤더를 자동 주입하지 않으므로** `x-contract-status: spec-derived; served-by=prism-mock`은 FE에서 합성:
  - `apps/web/src/lib/api-client.ts` 의 fetch 미들웨어가 `baseUrl` 호스트가 `localhost:4010`이면 응답 헤더 부재 시 `served-by=prism-mock`을 추가해 `contract-debug` 패널에 전달
- BE 종료 상태(포트 3000 closed)에서도 FE 전체 시나리오 동작 확인

**시연**:
```bash
# BE 끄기 (아무 것도 실행하지 않음)
pnpm mock:start   # Prism 4010 포트
pnpm start:web    # FE는 .env로 4010 baseUrl 사용
open http://localhost:5173   # BE 없이 FE 완전 동작
```

**Done-Definition (Ch05)**:
- BE를 끈 상태에서 FE Product 목록·상세 페이지가 정상 렌더링 (Prism이 examples/schema 기반 응답)
- `VITE_API_BASE_URL=http://localhost:4010`이 `apps/web/.env.ch05`로 분리
- FE `contract-debug` 배지에 `spec-derived; served-by=prism-mock` 표시 (FE 합성)
- BE를 다시 켜고 baseUrl을 3000으로 되돌리면 동일 코드가 실 BE 응답으로 동작

**보너스 학습 포인트 (Prism 요청 검증)**:

Prism mock은 OAS의 `parameters`/`requestBody` 스키마를 만족하지 않는 요청에 자동으로 422를 반환한다. 학습 시연으로:
```bash
curl 'http://localhost:4010/products/abc' -i
# HTTP/1.1 422 Unprocessable Entity — id 가 integer 타입이 아님
```
이는 "SoT가 yaml이면 잘못된 호출은 BE 코드 없이도 차단된다"를 보여준다.

**주석 강조점**: `// ✅ BE 없이 FE 동작. prism이 openapi.yaml schema로 응답 생성.`

---

### Ch06: Contract Testing — 런타임 표류 자동 검출 (`ch06-runtime-drift/`)

**시나리오**: "BE가 YAML과 다른 응답을 보내도 누가 잡아줄까?" BE `ProductController`의 응답에서 `priceInWon`을 실수로 `price`로 되돌린다. YAML은 `priceInWon`을 명시. `pnpm test:contract`를 실행하면 테스트가 즉시 fail한다. CI에 이 테스트가 올라가면 PR 단계에서 차단된다.

**학습 목표**: "Contract Testing은 BE 실응답을 OAS와 자동 비교한다. 사양 위반은 배포 후가 아닌 PR 단계에서 차단된다."

**구현 포인트**:
- BE `ch06-runtime-drift/products.controller.ts`: **의도적 위반 1건** — `priceInWon` 대신 `price` 반환 (코드 주석으로 위반 명시)
- 추가 엔드포인트 2개로 검증 다양성 확보:
  - `GET /products` (정상 — 통과 케이스)
  - `GET /users/:id` (선택 필드 누락 케이스 — `email` optional 처리 등 OAS `nullable` 학습)
- `test/contract/products.contract.spec.ts` (OpenAPI 3.x용 옵션 정정):
  ```typescript
  // OAS3에서는 components.schemas를 그대로 components: { schemas } 로 전달
  import OpenAPIResponseValidator from 'openapi-response-validator';
  import * as yaml from 'js-yaml';
  import * as fs from 'node:fs';
  import request from 'supertest';
  import { Test } from '@nestjs/testing';
  import { Ch06RuntimeDriftModule } from '../../apps/lecture/src/ch06-runtime-drift/ch06.module';

  const spec = yaml.load(
    fs.readFileSync('contracts/openapi.yaml', 'utf8'),
  ) as any;

  describe('Contract: GET /products/:id', () => {
    let app: import('@nestjs/common').INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [Ch06RuntimeDriftModule],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => app.close());

    it('matches OAS schema (priceInWon 표준)', async () => {
      const res = await request(app.getHttpServer()).get('/products/1');
      expect(res.status).toBe(200);

      const validator = new OpenAPIResponseValidator({
        responses: spec.paths['/products/{id}'].get.responses,
        components: { schemas: spec.components.schemas }, // OAS 3.x
      });
      const errors = validator.validateResponse(200, res.body);
      expect(errors).toBeUndefined(); // 위반 시 errors 객체 반환
    });
  });
  ```
- `x-contract-status: spec-derived; runtime-validated=ok|violation` 상태 결정 방식:
  1. `pnpm test:contract` 실행 후 결과를 `.contract-status.json`에 기록 (`{ "status": "ok" | "violation", "ranAt": "..." }`)
  2. `apps/lecture/src/common/contract-status.interceptor.ts`가 부팅 시 이 파일을 읽어 헤더 suffix로 추가
  3. 파일이 없거나 5분 초과 시 `runtime-validated=stale`로 표시 (학습자에게 재실행 유도)
- **시연 흐름**: 위반 상태로 테스트 fail → 헤더 `=violation` → `price` → `priceInWon` 수정 → 테스트 통과 → 헤더 `=ok`

**시연**:
```bash
pnpm start:dev     # Ch06 활성화 (의도적 위반 포함)
pnpm test:contract # FAIL — price vs priceInWon 위반 검출
# 코드 수정 후
pnpm test:contract # PASS — .contract-status.json 갱신
# BE 재시작 (interceptor가 새 파일 읽음)
pnpm start:dev
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: spec-derived; runtime-validated=ok
```

**Done-Definition (Ch06)**:
- 최소 3개 엔드포인트에 대한 contract test 존재 (`/products/:id`, `/products`, `/users/:id`)
- 의도적 위반 상태에서 `pnpm test:contract` exit code 1 + `priceInWon` 관련 에러 메시지
- 수정 후 `pnpm test:contract` exit code 0
- 응답 헤더가 위반 시 `runtime-validated=violation`, 통과 시 `runtime-validated=ok`로 변동
- CI 워크플로(`.github/workflows/contract.yml` 또는 README 안내)에서 `pnpm test:contract`가 PR 단계에 실행

**주석 강조점**: `// ❌ price 필드가 YAML의 priceInWon과 불일치. Contract test가 이를 잡아낸다.`

---

### Ch07: Generated React Query Hooks (`ch07-generated-hooks/`)

**시나리오**: Ch04에서 `openapi-fetch` + `paths`로 typed fetch를 얻었지만, FE는 여전히 endpoint마다 `useQuery({ queryKey, queryFn })`을 손으로 작성해야 한다. 50개 endpoint = 50개 보일러플레이트 + queryKey 일관성 관리. 새 BE endpoint가 추가될 때마다 FE도 손으로 hook 작성. mutation까지 가면 invalidation queryKey도 손으로 맞춰야 한다.

**학습 목표**: "타입 codegen에서 멈추지 않고, 비동기 패턴(query/mutation/invalidation)까지 SoT에서 자동 생성될 수 있다. modern monorepo의 FE DX는 SoT 한 줄 변경이 typed hooks까지 즉시 전파되는 것이다."

**구현 포인트**:
- `openapi-react-query` (TanStack Labs) 도입 — Ch04 `openapi-fetch`의 자매 프로젝트(같은 라인의 자연스러운 진화)
- `apps/web/src/lib/api-client.ts`에 추가:
  ```typescript
  import createClient from 'openapi-fetch';
  import { createClient as createApi } from 'openapi-react-query';
  import type { paths } from '@contracts/generated';

  const fetchClient = createClient<paths>({ baseUrl: import.meta.env.VITE_API_BASE_URL });
  export const $api = createApi(fetchClient);
  ```
- 사용 패턴 비교 (Ch04 ↔ Ch07):
  ```typescript
  // Ch04 — openapi-fetch + 손수 useQuery
  const { data } = useQuery({
    queryKey: ['products', id],
    queryFn: () => apiClient.GET('/products/{id}', { params: { path: { id } } }).then(r => r.data),
  });
  // Ch07 — openapi-react-query (한 줄)
  const { data } = $api.useQuery('get', '/products/{id}', { params: { path: { id } } });
  ```
- mutation + invalidation:
  ```typescript
  const create = $api.useMutation('post', '/orders');
  const queryClient = useQueryClient();
  const { queryKey } = $api.queryOptions('get', '/orders');
  create.mutate(
    { body: { userId: 1, items: [{ productId: 1, quantity: 2 }] } },
    { onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey.slice(0, 1) }) },
  );
  ```
- OAS yaml 확장: `POST /orders` + `CreateOrderInput` 스키마 추가 (`totalAmountInWon`은 BE가 unitPriceInWon × quantity 합으로 계산)
- BE: Ch04 controllers를 재사용 + `OrdersController.create()` 신규 1개. 모듈 ContractStatus 토큰 `'spec-derived; client=react-query'`
- FE 화면 2개:
  - `apps/web/src/ch07-generated-hooks/ProductList.tsx` — `$api.useQuery` 시연
  - `apps/web/src/ch07-generated-hooks/CreateOrderForm.tsx` — `$api.useMutation` + invalidation 시연

**OAS yaml 확장 (Ch04 yaml에 추가)**:
```yaml
paths:
  /orders:
    post:
      tags: [orders]
      summary: 주문 생성
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateOrderInput' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Order' }
        '400':
          description: Bad Request
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
components:
  schemas:
    CreateOrderInput:
      type: object
      required: [userId, items]
      properties:
        userId: { type: integer, minimum: 1 }
        items:
          type: array
          minItems: 1
          items:
            type: object
            required: [productId, quantity]
            properties:
              productId: { type: integer, minimum: 1 }
              quantity:  { type: integer, minimum: 1, maximum: 100 }
```

**측정**: `x-contract-status: spec-derived; client=react-query`

**시연**:
```bash
pnpm gen:types        # POST /orders + CreateOrderInput 반영된 be-types.ts
pnpm start:dev        # BE Ch07 활성
pnpm start:web        # FE
# 브라우저: 상품 선택 → '주문 생성' 버튼 → 목록 자동 갱신(invalidation)
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: spec-derived; client=react-query
```

**Done-Definition (Ch07)**:
- `$api.useQuery`로 Product list/detail 정상 렌더 — Ch04 hook 코드와 비교 시 wrapper 라인 ≥50% 감소 (README의 비교 표로 측정)
- `$api.useMutation`으로 주문 생성 + cache invalidation 동작 (목록이 자동 갱신됨)
- `contracts/openapi.yaml`에 `POST /orders` + `CreateOrderInput` 정의 추가
- `pnpm gen:types` 후 `contracts/generated/be-types.ts`에 `createOrder` operation + `CreateOrderInput` 타입 포함
- BE 응답 헤더 `x-contract-status: spec-derived; client=react-query`
- Ch06 contract test에 `POST /orders` 정상 응답(201)이 `Order` 스키마와 일치하는지 검증 케이스 1건 추가 (Ch08 진입 전)

**주석 강조점**: `// ✅ Codegen이 타입을 넘어 hook까지 책임진다. SoT의 영향 범위가 비동기 패턴까지 확장된다.`

---

### Ch08: Breaking Change Gate (`ch08-spec-compat/`)

**시나리오**: Ch06 contract test는 BE 응답을 *현재* OAS yaml과 비교한다. 그러나 OAS yaml 자체가 backward-incompatible하게 바뀌면(예: `priceInWon` → `priceUSD` rename, required 필드 제거) BE도 새 yaml에 맞춰 응답하므로 contract test는 통과한다. 그 사이 *기존 클라이언트*(이전 codegen 결과를 빌드한 다른 FE 앱·모바일·외부 통합)는 prod에서 표류한다.

**학습 목표**: "Contract test의 다음 단계는 *spec 자체의 호환성 게이트*다. PR 단계에서 backward-incompatible 변경을 자동 차단해 *spec semver*를 강제할 수 있다."

**구현 포인트**:
- `oasdiff` (Tufin, Go binary) — npx 또는 GitHub Action(`oasdiff/oasdiff-action`) 양방향 사용 가능
- `contracts/openapi.baseline.yaml` 신규 — Ch07 시점의 안정 yaml 스냅샷 (`cp`로 1회 생성, git 커밋)
- `pnpm test:compat`:
  ```bash
  npx --yes oasdiff breaking contracts/openapi.baseline.yaml contracts/openapi.yaml --fail-on ERR
  ```
- `scripts/run-oasdiff.mjs`: oasdiff 실행 + 결과를 `.compat-status.json`에 기록 (`{ status: 'stable' | 'breaking', ranAt: ISO }`)
- `apps/lecture/src/common/contract-status.interceptor.ts` 확장:
  - 부팅 시 `.compat-status.json` 읽어 헤더 suffix `compat=stable|breaking|unknown` 추가
  - Ch06과 동일한 5분 stale window
- BE 모듈: `apps/lecture/src/ch08-spec-compat/ch08.module.ts` — Ch07 controllers 재사용. ContractStatus 토큰은 `'spec-derived; runtime-validated=ok'`로 두고, compat suffix는 interceptor가 자동 합성
- CI: `.github/workflows/contract.yml`에 step 추가
  ```yaml
  - run: pnpm test:compat
  ```

**시연 흐름 (학습자가 실제로 손으로 따라하는 단계)**:
```bash
# 0) 안정 상태 baseline 생성 (Ch07 마무리 시점에 1회)
cp contracts/openapi.yaml contracts/openapi.baseline.yaml
git add contracts/openapi.baseline.yaml
git commit -m "chore: snapshot OAS baseline at Ch07"

# 1) 의도적 breaking 변경 시연
#    contracts/openapi.yaml의 components.schemas.Product에서 priceInWon → priceUSD rename
pnpm test:compat
# Output: ERR — required property removed: priceInWon (path: #/components/schemas/Product)
# Exit code 1

# 2) BE 재시작 후 헤더 확인
pnpm start:dev
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: spec-derived; runtime-validated=ok; compat=breaking

# 3) 변경 되돌리기 + test:compat 재실행
pnpm test:compat
# Output: stable. Exit 0.
# 헤더: compat=stable
```

**Done-Definition (Ch08)**:
- `contracts/openapi.baseline.yaml` 존재하고 git 커밋되어 있음
- `pnpm test:compat`: stable 상태에서 exit 0, breaking 변경 후 exit 1 + ERR 메시지
- `.compat-status.json`이 `scripts/run-oasdiff.mjs`로 갱신됨 (.gitignore 처리)
- BE 응답 헤더 suffix에 `compat=stable|breaking|unknown` 1종 항상 포함
- CI 워크플로 `.github/workflows/contract.yml`에 `pnpm test:compat` step 포함되어 PR에서 breaking 변경 시 차단
- spec yaml의 `info.version`은 변경 없음을 가정 — 본 챕터는 patch/minor/major 정책 자체를 다루지 않고 *기계적 호환성 게이트*에 집중 (학습 단순화)

**주석 강조점**: `// ❌ contracts/openapi.baseline.yaml과 호환되지 않는 변경. PR이 차단된다.`

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
| Ch07 | `spec-derived; client=react-query` | YAML (SoT) | codegen + hooks | 가능 |
| Ch08 | `spec-derived; runtime-validated=ok; compat=stable` | YAML (SoT) | codegen + hooks | 가능 + spec semver 게이트 |

---

## 챕터별 Done-Definition 요약 표

| Ch | 헤더 기대값 | FE 결과 | 테스트/명령 결과 | 핵심 명령 |
|----|------------|--------|----------------|----------|
| 01 | `not-tracked` | (FE 없음) | README cURL 예시 ↔ 실응답 불일치 학습자가 발견 | `curl :3000/products/1` |
| 02 | `code-derived` | Swagger UI 보고 수기 fetch 코드 동작 | `swagger:export` → yaml 산출 | `pnpm swagger:export` |
| 03 | `code-derived` | `category` 필드 `undefined` 렌더링, `contract-debug`가 미스매치 표시 | yaml 갱신은 가능, FE 타입 자동 동기화 불가 | `pnpm swagger:export` |
| 04 | `spec-derived` | codegen 타입으로 typesafe fetch | `pnpm gen:types` 후 BE/FE 동시 컴파일 | `pnpm gen:types && pnpm build` |
| 05 | `spec-derived; served-by=prism-mock` (FE 합성) | BE 종료 상태에서도 Product 목록·상세 정상 | Prism이 examples 우선·schema 폴백으로 응답 생성 | `pnpm mock:start` |
| 06 | 위반 시 `runtime-validated=violation`, 수정 후 `=ok` | 동일 FE | `test:contract` exit code 1→0 | `pnpm test:contract` |
| 07 | `spec-derived; client=react-query` | `$api.useQuery` + `useMutation` + invalidation 동작 | OAS yaml에 `POST /orders` 추가, hook 라인 ≥50% 감소 | `pnpm gen:types && pnpm start:web` |
| 08 | `spec-derived; runtime-validated=ok; compat=stable\|breaking` | (Ch07과 동일 화면) | `oasdiff` baseline 비교 — breaking 시 exit 1 | `pnpm test:compat` |

---

## package.json 전략

본 spec은 **루트 단일 `package.json`** 전략을 채택한다. 이유:
- 학습자 인지 부담 최소화 (하나의 `pnpm install`로 모든 의존성 해결)
- BE/FE/계약/도구 의존성이 한곳에서 가시화 — `dependencies`/`devDependencies` 비교가 학습 자료
- `apps/web/package.json`은 **생성하지 않음** (Vite는 루트 `vite.config.ts`로 동작 가능)

향후 별도 분리 필요 시 `pnpm workspace` 또는 `apps/web/package.json` 분리는 학습 외 영역으로 별도 마이그레이션.

---

## package.json 스크립트 추가

```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "start:web": "vite --config apps/web/vite.config.ts",
    "build": "nest build",
    "build:web": "vite build --config apps/web/vite.config.ts",
    "swagger:export": "ts-node scripts/export-swagger.ts",
    "gen:types": "node scripts/gen-types.mjs",
    "prebuild": "pnpm gen:types",
    "pretest": "pnpm gen:types",
    "mock:start": "prism mock contracts/openapi.yaml --port 4010",
    "test:contract": "jest --config jest.contract.config.ts",
    "test:compat": "node scripts/run-oasdiff.mjs"
  }
}
```

**`scripts/gen-types.mjs` (yaml 없을 때 안전하게 skip)**:
```javascript
// scripts/gen-types.mjs — Ch01-03에서는 contracts/openapi.yaml이 없으므로 skip
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const yaml = 'contracts/openapi.yaml';
if (!existsSync(yaml)) {
  console.log(`[gen:types] ${yaml} 없음 — skip (Ch01~Ch03 단계로 간주)`);
  process.exit(0);
}
const r = spawnSync(
  'npx',
  ['openapi-typescript', yaml, '-o', 'contracts/generated/be-types.ts'],
  { stdio: 'inherit' },
);
process.exit(r.status ?? 0);
```

**보조 스크립트 메모**:
- `scripts/export-swagger.ts`: NestJS app을 init만 시키고 `SwaggerModule.createDocument()` 결과를 `contracts/openapi.from-code.yaml`로 저장 (Ch02-03용, Ch04 SoT YAML과 분리)
- `prebuild`/`pretest` 훅은 yaml이 없는 Ch01-03에서도 *빌드를 깨뜨리지 않는다* — 위 스크립트가 즉시 0 exit
- `jest.contract.config.ts`: `testMatch: ['**/test/contract/**/*.spec.ts']`로 contract 테스트만 분리 실행

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
contracts/openapi.from-code.yaml
.contract-status.json
apps/web/dist/
apps/web/node_modules/
```

---

## `contracts/openapi.yaml` 샘플 (Ch04에서 처음 등장)

`domain.ts`(Ch04+ re-export)가 참조하는 모든 스키마 — `Product`, `User`, `Order`, `OrderStatus`, `OrderItem`, `ErrorResponse` — 를 포함해야 codegen 결과가 BE/FE 양쪽에서 컴파일된다. 학습자는 이 샘플을 그대로 두고 시작하며, Ch04~Ch06 진행 중 `category` 등 필드 추가로 확장한다.

```yaml
openapi: 3.1.0
info:
  title: OAS Lecture API
  version: 1.0.0
  description: 학습용 이커머스 API (Single Source of Truth)
servers:
  - url: http://localhost:3000
security: []                # 본 학습은 인증 미사용 (의도적 단순화)
tags:
  - { name: products, description: 상품 }
  - { name: users,    description: 사용자 }
  - { name: orders,   description: 주문 }
paths:
  /products:
    get:
      tags: [products]
      summary: 상품 목록
      operationId: listProducts
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Product' }
  /products/{id}:
    get:
      tags: [products]
      summary: 상품 단건 조회
      operationId: getProductById
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer, minimum: 1 } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Product' }
              examples:
                sample:
                  value: { id: 1, name: "사이다 1.5L", priceInWon: 2900, stock: 42, description: "탄산음료" }
        '404':
          description: Not Found
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
  /users/{id}:
    get:
      tags: [users]
      summary: 사용자 단건 조회
      operationId: getUserById
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer, minimum: 1 } }
      responses:
        '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
        '404': { description: Not Found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
components:
  schemas:
    Product:
      type: object
      required: [id, name, priceInWon, stock, description]
      properties:
        id:          { type: integer, minimum: 1 }
        name:        { type: string, minLength: 1 }
        priceInWon:  { type: integer, minimum: 0, description: "KRW 정수" }
        stock:       { type: integer, minimum: 0 }
        description: { type: string }
    User:
      type: object
      required: [id, email, name, createdAt]
      properties:
        id:        { type: integer, minimum: 1 }
        email:     { type: string, format: email }
        name:      { type: string, minLength: 1 }
        createdAt: { type: string, format: date-time }
    OrderStatus:
      type: string
      enum: [PENDING, PAID, SHIPPED, DELIVERED, CANCELLED]
    Order:
      type: object
      required: [id, userId, status, totalAmountInWon, createdAt]
      properties:
        id:               { type: integer, minimum: 1 }
        userId:           { type: integer, minimum: 1 }
        status:           { $ref: '#/components/schemas/OrderStatus' }
        totalAmountInWon: { type: integer, minimum: 0 }
        createdAt:        { type: string, format: date-time }
    OrderItem:
      type: object
      required: [id, orderId, productId, quantity, unitPriceInWon]
      properties:
        id:             { type: integer, minimum: 1 }
        orderId:        { type: integer, minimum: 1 }
        productId:      { type: integer, minimum: 1 }
        quantity:       { type: integer, minimum: 1 }
        unitPriceInWon: { type: integer, minimum: 0 }
    ErrorResponse:
      type: object
      required: [statusCode, message]
      properties:
        statusCode: { type: integer }
        message:    { type: string }
        error:      { type: string }
```

이 샘플은 Ch04에서 학습자가 그대로 두고 시작하는 baseline. Ch06 contract test는 정상 응답(200)뿐 아니라 404 응답이 `ErrorResponse` 스키마와 일치하는지도 검증한다.

> Ch07에서 학습자가 `POST /orders` + `CreateOrderInput`을 직접 추가한다. Ch08은 이 시점의 yaml을 `contracts/openapi.baseline.yaml`로 스냅샷하고, 이후 변경의 호환성을 비교한다.

---

## CI 워크플로 (최소)

```yaml
# .github/workflows/contract.yml
name: Contract
on: [pull_request]
jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm gen:types          # YAML → 타입 재생성
      - run: pnpm build              # BE/FE 컴파일 (prebuild가 gen:types 재실행 OK)
      - run: pnpm test:contract      # 위반 시 PR 차단
      - run: pnpm test:compat        # Ch08~ breaking 변경 시 PR 차단
```

학습 자료 시연 시에는 GitHub Actions 미설정 환경도 고려해 README에 동일 명령(`pnpm test:contract`)을 강조한다.

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
2. **Code-First 잔존 (Ch04 이후 `@nestjs/swagger` 경계)**:
   - Ch01: 사용 안 함
   - Ch02-03: `@ApiProperty` 데코레이터 적극 사용 + Swagger UI 마운트
   - Ch04+: **신규 `@ApiProperty` 작성 금지**. 의존성은 비교 시연을 위해 패키지에 남겨두되 컨트롤러/DTO 코드에서 사용하지 않음. 학습자가 "Code-First 산출물(`pnpm swagger:export`)"과 "Design-First SoT(`contracts/openapi.yaml`)"를 직접 비교 가능
3. **Mock 서버 3 포트**: BE(3000)/FE(5173)/Prism(4010) — 터미널 3개 필요. README에 명시.
4. **Prism 헤더 합성**: Prism은 사용자 정의 헤더를 자동 주입하지 않음. Ch05의 `served-by=prism-mock` 표시는 FE 측에서 baseUrl 검사 후 합성 (실제 BE 헤더가 아님을 학습자에게 명시).
5. **`runtime-validated` 헤더의 신선도**: Ch06에서 `.contract-status.json`을 부팅 시 1회 읽음. 5분 초과 시 `=stale` 표시로 재실행 유도. 진정한 실시간 검증은 학습 범위 외.
6. **`openapi-response-validator` vs Schemathesis**: 전자 선택. Schemathesis(Python)는 학습 범위 초과.
7. **OpenAPI 3.1 vs 3.0**: 3.1 채택 (JSON Schema 2020-12 슈퍼셋). 일부 도구(특히 구버전 SwaggerUI/codegen)는 3.0만 지원하므로 시연 환경 도구 버전을 README에 명시.
8. **버전 정책**: 본 spec의 의존성 버전(`^X.x`)은 *작성 시점(2026-04-27) 기준 호환되는 메이저 라인*. 실제 `pnpm install` 시 lock 파일이 진실의 원천. NestJS 11 ↔ `@nestjs/swagger` v11+ 같은 메이저 호환성 제약이 우선한다.
9. **타입 codegen ≠ 런타임 검증**: `openapi-typescript`는 컴파일 타임 타입만 생성. NestJS `ValidationPipe`는 클래스+데코레이터를 요구하므로 Ch04+ 런타임 검증은 AJV 또는 Prism request validation으로 분담 (Ch04 본문 표 참조). 런타임 클래스 코드젠을 원하면 `@hey-api/openapi-ts` 등 별도 도구가 필요 — 본 spec 범위 외.
10. **`prebuild`/`pretest` 안전성**: `gen:types` 훅이 Ch01-03에서 yaml 부재로 깨지지 않도록 `scripts/gen-types.mjs`에서 파일 존재 시만 실행. 학습자가 Ch01만 켜고 빌드해도 동작.
11. **Generated hooks의 query key 안정성**: `openapi-react-query`는 path 기반 자동 query key를 생성한다. 수동 invalidation 시 `$api.queryOptions('get', '/orders').queryKey`를 사용하고, 직접 문자열 배열을 만들어 invalidate하지 않는다. queryKey 구조가 라이브러리 내부 컨벤션이며 메이저 업데이트에서 바뀔 수 있다.
12. **`oasdiff`의 false positive 가능성**: 대부분의 backward-incompatible 변경은 ERR로 정확히 잡히지만, optional 필드 추가 같은 호환 변경이 드물게 ERR로 분류되는 경우가 있다. `--severity-levels` 옵션 또는 `oasdiff/ignore` 파일로 조정 가능. 학습 시연에서는 명백한 breaking(required 제거, 필드 rename, enum 값 제거)만 사용한다.
