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

## Ch01 시연 (REST)

```bash
pnpm start:dev
curl http://localhost:3000/web/products/1          # Web BFF
curl http://localhost:3000/mobile/products?limit=5 # Mobile BFF
curl http://localhost:3000/admin/users             # Admin BFF (fullName vs name 불일치)
```

응답 헤더 `x-mock-db-calls`로 mock DB 호출 횟수 확인.

## Ch02~05 시연 (GraphQL)

`app.module.ts`에서 원하는 챕터 활성화 후:

```bash
pnpm start:dev
# Apollo Sandbox: http://localhost:3000/graphql
```

`operations/` 폴더의 `.graphql` 파일을 Sandbox에 붙여넣기.

## Ch06 시연 (Federation)

```bash
# 3개 터미널
pnpm start:users      # :3001 — users-subgraph
pnpm start:orders     # :3002 — orders-subgraph
pnpm start:gateway    # :3000 — gateway (두 subgraph 부팅 후)

# 단일 쿼리로 두 subgraph 데이터 통합
curl -X POST http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ order(id:1){ id status user{ id name } items{ quantity product{ name } } } }"}'
```

## 디렉토리

```
apps/
  lecture/                # Ch01~05 (app.module.ts에서 챕터 토글)
  users-subgraph/         # Ch06 — User 엔티티 소유
  orders-subgraph/        # Ch06 — Order/Product 소유
  gateway/                # Ch06 — Federation 슈퍼그래프
libs/
  mock-data/              # 공통 in-memory 스토어 + 호출 카운터 (AsyncLocalStorage)
operations/               # 챕터별 .graphql 예시
  ch02-storefront.graphql
  ch03-order-detail.graphql
  ch04-list-orders.graphql
  ch05/                   # Operation 베스트프랙티스 5종
docs/superpowers/
  specs/2026-04-26-graphql-lecture-suite-design.md
  plans/2026-04-26-graphql-lecture-suite.md
```

## 학습 보조

- **호출 카운터**: 응답 헤더 `x-mock-db-calls` — Ch03 vs Ch04에서 숫자 차이를 직접 비교
- **결정론적 시드**: `faker.seed(42)` — 재시작해도 같은 데이터
- **챕터 격리**: Ch02~05는 한 번에 하나의 GraphQL 모듈만 활성화 (스키마 충돌 방지)
- **Apollo Sandbox**: `http://localhost:<port>/graphql` — Introspection 기반 GUI

## 노트 인사이트 매핑

`docs/superpowers/specs/2026-04-26-graphql-lecture-suite-design.md` 참고.
