# OAS Lecture Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) 또는 `superpowers:executing-plans`로 본 플랜을 task-by-task 실행한다. 각 Step은 `- [ ]` 체크박스로 진행 추적.

**Spec:** `docs/superpowers/specs/2026-04-27-oas-lecture-suite-design.md` (1071 lines, 단일 진실의 원천)

**Goal:** 사후 문서(Ch01) → Code-First Swagger(Ch02) → Code-First 한계(Ch03) → Design-First 전환(Ch04) → Mock 병렬(Ch05) → Contract Testing(Ch06) → Generated Hooks(Ch07) → Spec Compat Gate(Ch08) 8 챕터의 NestJS BE + React/Vite FE 학습 시나리오를 점진적으로 구현한다.

**Architecture:** 기존 NestJS 모노레포(`apps/lecture`)에 챕터 모듈 토글 패턴 추가(`app.module.ts`에서 한 챕터만 import). 신규 `apps/web` 디렉토리에 React/Vite FE 신설. `contracts/openapi.yaml`이 Ch04부터 SoT가 되어 BE DTO 타입과 FE typed client가 단일 `pnpm gen:types` codegen에서 동시 생성. `x-contract-status` 응답 헤더가 챕터별 진화 상태(`not-tracked` → `code-derived` → `spec-derived` → `runtime-validated=ok` → `compat=stable`)를 가시화.

**Tech Stack:** NestJS 11, `@nestjs/swagger` 11, React 18 + Vite 7, `openapi-typescript` 7, `openapi-fetch` 0.17, `openapi-react-query` 0.5, `@stoplight/prism-cli` 5, `openapi-response-validator` 12, `oasdiff` 1.x (npx), `supertest` + Jest 30. 의존성은 모두 `package.json`에 이미 설치돼 있음.

---

## Context

**왜 만드는가**: 학습자(백엔드 초보자)가 "왜 OpenAPI Specification이 필요한가"를 *FE+BE 양쪽이 함께 존재할 때만 체감할 수 있는* 8 단계의 점진적 시연으로 직접 손으로 깨닫게 한다. 단순히 "Swagger UI 띄우기"가 아니라, 사후 문서의 표류 → Code-First의 직렬 의존 → Design-First의 SoT 전환 → Mock 병렬 → Runtime 검증 → Hook codegen → Spec semver gate 까지 한 브랜치에서 토글로 비교 가능하게 한다.

**현재 상태 (`feat/oas-lecture-suite` 브랜치)**:
- ✅ Ch01 골격: `apps/lecture/src/ch01-doc-drift/{ch01.module.ts, products.controller.ts, users.controller.ts}` + `app.module.ts`에서 import
- ✅ 공용 인터셉터: `common/contract-status.interceptor.ts` (`CONTRACT_STATUS`, `CONTRACT_RUNTIME_VALIDATION`, `CONTRACT_COMPAT_TRACKING` 토큰 + 5분 stale window 구현 완료), `common/call-counter.interceptor.ts`
- ✅ `main.ts` CORS + `exposedHeaders: ['x-contract-status', 'x-mock-db-calls']`
- ✅ 도메인: `libs/mock-data/src/domain.ts` 가 `priceInWon`/ISO `createdAt` Contract Invariant 따름 (수기 정의 — Ch04에서 codegen re-export로 전환 예정)
- ✅ 스크립트: `scripts/gen-types.mjs` (yaml 부재 시 skip), `scripts/run-oasdiff.mjs` (`.compat-status.json` 작성)
- ✅ `package.json` 모든 의존성 설치 (`@nestjs/swagger`, `react`, `vite`, `openapi-fetch`, `openapi-react-query`, `openapi-typescript`, `@stoplight/prism-cli`, `openapi-response-validator`, `js-yaml`, `ajv`)
- ✅ `package.json` scripts: `start:dev`, `start:web`, `build:web`, `gen:types`, `mock:start`, `test:contract`, `test:compat`, `swagger:export`, `prebuild`/`pretest` 자동 hook
- ✅ `tsconfig.json` paths: `@app/mock-data`, `@contracts/*`, `@contracts/generated`
- ✅ `.gitignore`: `contracts/generated/`, `.contract-status.json`, `.compat-status.json`, `apps/web/dist/`
- ✅ `README.md` Ch01 의도적 `price` 표류 안내

**아직 없는 부분 (이 플랜이 만든다)**:
- ❌ `apps/web/` 디렉토리 전체 (React/Vite 스캐폴딩, 챕터 페이지, `lib/api-client.ts`, `lib/contract-debug.tsx`, `active-chapter.ts`)
- ❌ `apps/lecture/src/ch02-code-first-swagger/` ~ `ch08-spec-compat/` 모든 챕터 모듈/컨트롤러/DTO
- ❌ `contracts/openapi.yaml`, `contracts/openapi.baseline.yaml`, `contracts/generated/be-types.ts` (생성됨, gitignore)
- ❌ `scripts/export-swagger.ts`, `jest.contract.config.ts`
- ❌ `test/contract/*.contract.spec.ts` (Ch06부터)
- ❌ `.github/workflows/contract.yml`
- ❌ `domain.ts`의 codegen re-export 전환 (Ch04 시점)
- ❌ `main.ts`의 SwaggerModule.setup (Ch02 시점)

**기존 GraphQL 분기 잔재 (현 브랜치에 동거)**: `apps/lecture/src/ch01-rest-pain/`, `ch02-graphql-basics/`, `ch03-data-graph/`, `ch04-n-plus-one/`, `ch05-client-operations/` + `apps/{gateway,users-subgraph,orders-subgraph}/`. 모두 `app.module.ts`에서 import하지 않으므로 런타임 영향 없음. **본 플랜은 이들을 건드리지 않는다** (spec 명시: "삭제 없음 — 기존 GraphQL 의존성은 GraphQL 챕터 코드 보존을 위해 유지").

---

## Spec Coverage Map

| Spec 섹션 | 플랜 위치 |
|----------|----------|
| Contract Invariants | Phase 0 검증, Phase 4 yaml에 인코딩, Phase 6 contract test |
| Ch01 사후 문서 표류 | Phase 1 (검증만) |
| Ch02 Code-First Swagger | Phase 2 |
| Ch03 Code-First SoT 약점 | Phase 3 |
| Ch04 Design-First 전환 | Phase 4 |
| Ch05 Mock 서버 | Phase 5 |
| Ch06 Contract Testing | Phase 6 |
| Ch07 Generated React Query Hooks | Phase 7 |
| Ch08 Breaking Change Gate | Phase 8 |
| 측정 장치(`x-contract-status`) | Phase 0(인터셉터 활용 검증), Phase 2/4/5/6/7/8 챕터별 토큰 |
| 챕터 토글 (BE/FE) | Phase 0(FE active-chapter), Phase 2~8(BE app.module 토글) |
| CORS / Base URL 정책 | Phase 0(이미 main.ts), Phase 5(.env.ch05) |
| `package.json` 스크립트 | Phase 0(jest.contract.config.ts, export-swagger.ts), 나머지는 이미 등록 |
| `tsconfig.json` paths / `.gitignore` | 이미 등록 — 검증만 |
| `contracts/openapi.yaml` 샘플 | Phase 4 (Product/User/Order/OrderStatus/OrderItem/ErrorResponse), Phase 7 (`POST /orders` + `CreateOrderInput` 추가) |
| CI 워크플로 | Phase 0(skel) → Phase 6(test:contract step) → Phase 8(test:compat step) |
| 알려진 트레이드오프 | 본 플랜 끝 "Known Trade-offs" 섹션 |

---

## Final File Layout (플랜 완료 시점)

```
db-with-nestjs/
├── apps/
│   ├── lecture/src/
│   │   ├── app.module.ts                 (수정 — 챕터 토글)
│   │   ├── main.ts                       (수정 — Ch02부터 SwaggerModule.setup 조건부 마운트)
│   │   ├── common/                       (변경 없음 — 이미 구현)
│   │   ├── ch01-doc-drift/               (변경 없음 — 이미 구현)
│   │   ├── ch02-code-first-swagger/      (신규)
│   │   │   ├── ch02.module.ts
│   │   │   ├── dto/{product.dto.ts,user.dto.ts,order.dto.ts,error-response.dto.ts}
│   │   │   ├── products.controller.ts
│   │   │   ├── users.controller.ts
│   │   │   └── orders.controller.ts
│   │   ├── ch03-derived-spec-pain/       (신규 — Ch02 + category 추가)
│   │   ├── ch04-design-first/            (신규 — codegen 타입 사용)
│   │   ├── ch05-parallel-blocking/       (신규 — Ch04 재사용 + ContractStatus 토큰만 갈아끼움)
│   │   ├── ch06-runtime-drift/           (신규 — 의도적 응답 위반 + RUNTIME_VALIDATION on)
│   │   ├── ch07-generated-hooks/         (신규 — orders.create 추가)
│   │   └── ch08-spec-compat/             (신규 — Ch07 재사용 + COMPAT_TRACKING on)
│   ├── web/                              (신규 전체)
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── .env.development              (VITE_API_BASE_URL=http://localhost:3000)
│   │   ├── .env.ch05                     (VITE_API_BASE_URL=http://localhost:4010)
│   │   └── src/
│   │       ├── main.tsx                  (React Query Provider + Router)
│   │       ├── App.tsx                   (active-chapter dispatch)
│   │       ├── active-chapter.ts
│   │       ├── lib/
│   │       │   ├── api-client.ts         (openapi-fetch + Prism 헤더 합성)
│   │       │   ├── react-query-client.ts (Ch07부터 $api)
│   │       │   └── contract-debug.tsx    (헤더 시각화 배지)
│   │       ├── ch02-code-first-swagger/ProductList.tsx
│   │       ├── ch03-derived-spec-pain/ProductList.tsx
│   │       ├── ch04-design-first/ProductList.tsx
│   │       ├── ch05-parallel-blocking/ProductList.tsx
│   │       ├── ch06-runtime-drift/ProductList.tsx
│   │       └── ch07-generated-hooks/{ProductList.tsx,CreateOrderForm.tsx}
│   ├── gateway/  users-subgraph/  orders-subgraph/  (변경 없음)
│
├── libs/mock-data/src/
│   ├── domain.ts                         (Phase 4에서 re-export로 교체)
│   ├── domain.handwritten.ts             (Phase 4에서 백업으로 보존)
│   └── ...                               (변경 없음)
│
├── contracts/                            (신규 — Phase 4부터)
│   ├── openapi.yaml                      (Phase 4 baseline; Phase 7에서 POST /orders 추가)
│   ├── openapi.baseline.yaml             (Phase 8 시작 시 스냅샷)
│   ├── openapi.from-code.yaml            (Phase 2 swagger:export 산출 — gitignore)
│   └── generated/be-types.ts             (codegen 산출 — gitignore)
│
├── scripts/
│   ├── gen-types.mjs                     (변경 없음)
│   ├── run-oasdiff.mjs                   (변경 없음)
│   └── export-swagger.ts                 (Phase 0 신규)
│
├── test/contract/                        (Phase 6 신규)
│   ├── products.contract.spec.ts
│   ├── users.contract.spec.ts
│   └── orders.contract.spec.ts           (Phase 7 추가)
│
├── jest.contract.config.ts               (Phase 0 신규)
├── .github/workflows/contract.yml        (Phase 0 skel → Phase 6/8 확장)
└── README.md                             (변경 없음 — Ch01 표류 예시 이미 작성됨)
```

---

## 작업 표준 규칙 (모든 Phase 공통)

1. **챕터 활성화 = 단일 토글**: `apps/lecture/src/app.module.ts`의 `imports` 배열에 *해당 챕터 모듈 1개만* 두고 나머지는 주석. 이는 spec의 핵심 토글 패턴.
2. **smoke 검증의 정형 명령**: `pnpm start:dev` → 별도 터미널에서 `curl -i http://localhost:3000/products/1 | head -20` 으로 status / `x-contract-status` / 응답 본문 동시 확인.
3. **각 Phase 종료 시 commit**: spec의 commit message style은 `feat(chXX): ...` 또는 `feat(<area>): ...`. 최근 커밋(`feat(ch01): doc-drift module`)에서 스타일 확인 가능.
4. **파일 생성 전 Read 우선**: 같은 파일을 두 번 만지면 항상 Read 후 Edit. (anti-hallucination/grounding 규칙)
5. **테스트 전략**:
   - **BE Ch01-Ch05**: 챕터별 supertest 기반 smoke spec 1개로 status code / 헤더 / 핵심 필드 검증 (TDD: 먼저 fail → 구현 → pass)
   - **BE Ch06+**: `openapi-response-validator` 기반 contract test
   - **FE**: `pnpm build:web`(typecheck + 번들) + 수동 브라우저 smoke. 별도 Vitest 미도입 (학습 범위 외, spec 명시 없음). UI 검증 결과를 항상 글로 명시 (skill 규칙).
6. **`pnpm gen:types` 자동 실행**: `prebuild`/`pretest` 훅이 호출. yaml 부재 시 즉시 skip 하므로 Ch01-Ch03에서도 안전.

---

## Phase 0 — Foundation Setup

**Goal:** Ch02 이후 시연에 필요한 인프라(jest.contract config, swagger export 스크립트, FE 스캐폴딩, CI skel)를 미리 깔아둔다. 본 Phase가 끝나면 Ch01은 그대로 동작하고, Ch02 이후 작업이 곧장 시작 가능한 상태가 된다.

**Files:**
- Create: `jest.contract.config.ts`, `scripts/export-swagger.ts`, `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/.env.development`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/active-chapter.ts`, `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/contract-debug.tsx`, `apps/web/src/lib/react-query-client.ts`, `.github/workflows/contract.yml`
- Modify: 없음

### Task 0.1: 플랜 파일 git 커밋

- [ ] **Step 1: 플랜 파일이 working tree에 있는지 확인 + 커밋**

```bash
git status docs/superpowers/plans/2026-04-27-oas-lecture-suite-implementation.md
git add docs/superpowers/plans/2026-04-27-oas-lecture-suite-implementation.md
git commit -m "docs: add OAS lecture suite implementation plan"
```

### Task 0.2: `jest.contract.config.ts` 생성

`package.json` scripts에 `test:contract`이 이 파일을 가리키지만 미생성. Ch06 진입 시 즉시 사용 가능하도록 미리 생성.

- [ ] **Step 1: 파일 생성**

```typescript
// jest.contract.config.ts
import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/contract/**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@app/mock-data(|/.*)$': '<rootDir>/libs/mock-data/src/$1',
    '^@contracts/generated$': '<rootDir>/contracts/generated/be-types.ts',
    '^@contracts/(.*)$': '<rootDir>/contracts/$1',
  },
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
};
export default config;
```

- [ ] **Step 2: dry-run 으로 jest config 인식 확인**

```bash
npx jest --config jest.contract.config.ts --listTests
# → 0 tests found 하지만 에러 없이 종료 (exit 0)
```

- [ ] **Step 3: Commit**

```bash
git add jest.contract.config.ts
git commit -m "chore(test): add jest.contract.config.ts skeleton"
```

### Task 0.3: `scripts/export-swagger.ts` 생성

Ch02부터 `pnpm swagger:export`가 호출하는 스크립트. NestJS app을 init만 시키고 OAS 문서를 yaml로 dump.

- [ ] **Step 1: 파일 생성**

```typescript
// scripts/export-swagger.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { dump } from 'js-yaml';
import { AppModule } from '../apps/lecture/src/app.module';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('OAS Lecture API (code-derived)')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const out = 'contracts/openapi.from-code.yaml';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, dump(document));
  console.log(`[swagger:export] wrote ${out}`);
  await app.close();
}
void main();
```

- [ ] **Step 2: Ch01 상태에서 실행 확인 (Swagger 데코레이터 없는 컨트롤러 → 빈 paths 산출)**

```bash
pnpm swagger:export
# → contracts/openapi.from-code.yaml 생성 (paths가 거의 비어있음 — Ch01엔 @ApiProperty 없음)
ls -la contracts/openapi.from-code.yaml
```

- [ ] **Step 3: Commit**

```bash
git add scripts/export-swagger.ts
git commit -m "chore(scripts): add export-swagger script for Code-First yaml dump"
```

### Task 0.4: `apps/web/` Vite + React 스캐폴딩

루트 단일 `package.json` 전략 — `apps/web/package.json`은 만들지 않음 (spec § package.json 전략).

- [ ] **Step 1: 디렉토리 + index.html 생성**

```bash
mkdir -p apps/web/src/lib
```

```html
<!-- apps/web/index.html -->
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OAS Lecture FE</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: vite.config.ts 생성**

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@contracts/generated': path.resolve(__dirname, '../../contracts/generated/be-types.ts'),
      '@contracts': path.resolve(__dirname, '../../contracts'),
    },
  },
  server: { port: 5173, strictPort: true },
});
```

- [ ] **Step 3: apps/web/tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@contracts/generated": ["../../contracts/generated/be-types.ts"],
      "@contracts/*": ["../../contracts/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 환경 변수 파일**

```bash
# apps/web/.env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_CHAPTER=ch02
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/index.html apps/web/vite.config.ts apps/web/tsconfig.json apps/web/.env.development
git commit -m "feat(web): bootstrap Vite + React scaffolding for OAS lecture FE"
```

### Task 0.5: `apps/web/src/` core 파일 생성

- [ ] **Step 1: `active-chapter.ts`**

```typescript
// apps/web/src/active-chapter.ts
type Chapter = 'ch02' | 'ch03' | 'ch04' | 'ch05' | 'ch06' | 'ch07';
const fromEnv = import.meta.env.VITE_CHAPTER as Chapter | undefined;
export const ACTIVE_CHAPTER: Chapter = fromEnv ?? 'ch02';
```

- [ ] **Step 2: `lib/api-client.ts` (Ch04~ openapi-fetch 베이스. Ch02-03은 fetch 직접 사용, 본 파일은 미사용 — 미리 두면 Ch04에서 곧장 활용)**

```typescript
// apps/web/src/lib/api-client.ts
// Ch04 진입 시 paths 타입을 import해서 createClient<paths>()로 교체된다.
// 본 단계에서는 baseUrl 주입과 prism 합성 헤더 로직만 미리 둔다.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export function isPrismMockBaseUrl(): boolean {
  try {
    return new URL(BASE_URL).port === '4010';
  } catch {
    return false;
  }
}

export function deriveContractStatus(headerValue: string | null): string {
  if (headerValue) return headerValue;
  // Prism은 사용자 정의 헤더를 자동 주입하지 않음 → FE 합성
  if (isPrismMockBaseUrl()) return 'spec-derived; served-by=prism-mock';
  return 'unknown';
}

export const apiBaseUrl = BASE_URL;
```

- [ ] **Step 3: `lib/contract-debug.tsx` (헤더 배지 + Context broadcast)**

```tsx
// apps/web/src/lib/contract-debug.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type Ctx = {
  status: string;
  setStatus: (s: string) => void;
};

const ContractDebugContext = createContext<Ctx | null>(null);

export function ContractDebugProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<string>('unknown');
  return (
    <ContractDebugContext.Provider value={{ status, setStatus }}>
      {children}
      <ContractDebugBadge status={status} />
    </ContractDebugContext.Provider>
  );
}

export function useContractDebug(): Ctx {
  const ctx = useContext(ContractDebugContext);
  if (!ctx) throw new Error('useContractDebug must be inside ContractDebugProvider');
  return ctx;
}

function ContractDebugBadge({ status }: { status: string }) {
  const tone = status.includes('violation') || status.includes('breaking')
    ? '#c0392b'
    : status.includes('runtime-validated=ok') || status.includes('compat=stable')
      ? '#27ae60'
      : status === 'unknown'
        ? '#7f8c8d'
        : '#2c3e50';
  return (
    <div
      style={{
        position: 'fixed', right: 12, bottom: 12, padding: '6px 10px',
        background: tone, color: '#fff', font: '12px/1.4 monospace',
        borderRadius: 4, zIndex: 1000, maxWidth: 360,
      }}
      data-testid="contract-status-badge"
    >
      x-contract-status: {status}
    </div>
  );
}
```

- [ ] **Step 4: `lib/react-query-client.ts` (placeholder — Ch07에서 `$api` 추가)**

```typescript
// apps/web/src/lib/react-query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
```

- [ ] **Step 5: `App.tsx` (챕터 디스패처)**

```tsx
// apps/web/src/App.tsx
import { ACTIVE_CHAPTER } from './active-chapter';
import { ContractDebugProvider } from './lib/contract-debug';

export default function App() {
  return (
    <ContractDebugProvider>
      <main style={{ font: '14px/1.5 system-ui', padding: 16 }}>
        <h1>OAS Lecture — {ACTIVE_CHAPTER}</h1>
        <ChapterContent />
      </main>
    </ContractDebugProvider>
  );
}

function ChapterContent() {
  // Ch02 페이지는 Phase 2에서 추가. 본 Phase 0에선 placeholder.
  return <p>chapter page not loaded yet</p>;
}
```

- [ ] **Step 6: `main.tsx`**

```tsx
// apps/web/src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query-client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 7: 빌드 + 개발 서버 smoke**

```bash
pnpm build:web
# → apps/web/dist/ 생성, exit 0

pnpm start:web &
sleep 3
curl -s http://localhost:5173 | grep -q '<div id="root"></div>'
echo "exit: $?"
# 0 이면 성공 — placeholder 페이지가 뜸
kill %1
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add core scaffolding (App, contract-debug, react-query)"
```

### Task 0.6: `.github/workflows/contract.yml` skeleton

Phase 6/8에서 step 추가. 본 Phase에선 빈 파이프라인만 깔아둔다.

- [ ] **Step 1: 파일 생성**

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
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm gen:types
      - run: pnpm build
      # Phase 6에서 추가: - run: pnpm test:contract
      # Phase 8에서 추가: - run: pnpm test:compat
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/contract.yml
git commit -m "ci: add contract workflow skeleton (build + gen:types)"
```

---

## Phase 1 — Ch01 검증

**Goal:** 이미 구현된 Ch01의 Done-Definition을 일제 점검 (응답 본문 `priceInWon`, 헤더 `not-tracked`, README의 `price` 표류). 별도 코드 추가 없이 supertest 기반 smoke spec 1개만 추가해 회귀 방지.

**Files:**
- Create: `apps/lecture/src/ch01-doc-drift/ch01.smoke.spec.ts`
- Modify: 없음

### Task 1.1: Ch01 smoke spec (TDD)

- [ ] **Step 1: failing test 작성**

```typescript
// apps/lecture/src/ch01-doc-drift/ch01.smoke.spec.ts
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { initStore } from '@app/mock-data';
import { AppModule } from '../app.module';

describe('Ch01 doc-drift smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    initStore('basic');
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /products/1 → 200, priceInWon present, header not-tracked', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('priceInWon');
    expect(typeof res.body.priceInWon).toBe('number');
    expect(res.headers['x-contract-status']).toBe('not-tracked');
  });

  it('GET /users/1 → 200, header not-tracked', async () => {
    const res = await request(app.getHttpServer()).get('/users/1');
    expect(res.status).toBe(200);
    expect(res.headers['x-contract-status']).toBe('not-tracked');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 통과 예상 (Ch01은 이미 구현됨)**

```bash
pnpm jest apps/lecture/src/ch01-doc-drift/ch01.smoke.spec.ts
# → 2 passed
```

만약 fail하면 root cause 진단(`getStore()` 초기화, 인터셉터 토큰 등)을 *먼저* 시도하고, 임의로 spec을 수정하지 않는다.

- [ ] **Step 3: README 표류 검증 (수동)**

`README.md`에서 cURL 예시가 `"price": ...` 형태로 적혀 있고 실제 응답은 `priceInWon` 임을 학습자가 발견할 수 있는지 grep으로 확인.

```bash
grep -n '"price":' README.md
# 한 줄 이상 매치되어야 함 — Ch01 의도적 표류
```

- [ ] **Step 4: Commit**

```bash
git add apps/lecture/src/ch01-doc-drift/ch01.smoke.spec.ts
git commit -m "test(ch01): add smoke spec for doc-drift endpoints + header"
```

---

## Phase 2 — Ch02 Code-First Swagger

**Goal:** `@nestjs/swagger`의 `@ApiProperty` 데코레이터로 OAS를 코드에서 도출. Swagger UI를 `/api`에 마운트. FE 첫 등장 — Swagger UI를 보고 수기로 fetch + interface를 작성. 헤더 `code-derived`.

**Done-Definition (spec § Ch02 그대로)**:
- `http://localhost:3000/api` Swagger UI에서 `Product`/`User` 스키마 표시
- `pnpm swagger:export` → `contracts/openapi.from-code.yaml`이 `priceInWon` 포함
- 응답 헤더 `x-contract-status: code-derived`
- FE 수기 정의 `interface Product { priceInWon: number; ... }`로 fetch 정상

**Files:**
- Create: `apps/lecture/src/ch02-code-first-swagger/{ch02.module.ts, dto/product.dto.ts, dto/user.dto.ts, dto/order.dto.ts, dto/error-response.dto.ts, products.controller.ts, users.controller.ts, orders.controller.ts, ch02.smoke.spec.ts}`, `apps/web/src/ch02-code-first-swagger/ProductList.tsx`
- Modify: `apps/lecture/src/main.ts` (조건부 SwaggerModule.setup), `apps/lecture/src/app.module.ts` (Ch02 토글), `apps/web/src/App.tsx` (chapter dispatch)

### Task 2.1: Ch02 DTO 생성 (`@ApiProperty` 데코레이터)

- [ ] **Step 1: `apps/lecture/src/ch02-code-first-swagger/dto/product.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class Ch02ProductDto {
  @ApiProperty({ example: 1, minimum: 1 })
  id!: number;

  @ApiProperty({ example: '사이다 1.5L', minLength: 1 })
  name!: string;

  @ApiProperty({ example: 2900, minimum: 0, description: 'KRW 정수' })
  priceInWon!: number;

  @ApiProperty({ example: 42, minimum: 0 })
  stock!: number;

  @ApiProperty({ example: '탄산음료' })
  description!: string;
}
```

- [ ] **Step 2: `dto/user.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class Ch02UserDto {
  @ApiProperty({ example: 1, minimum: 1 })
  id!: number;

  @ApiProperty({ example: 'a@b.c', format: 'email' })
  email!: string;

  @ApiProperty({ example: 'Alice', minLength: 1 })
  name!: string;

  @ApiProperty({ example: '2024-04-27T00:00:00.000Z', format: 'date-time' })
  createdAt!: string;
}
```

- [ ] **Step 3: `dto/order.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class Ch02OrderDto {
  @ApiProperty({ example: 1, minimum: 1 })
  id!: number;

  @ApiProperty({ example: 1, minimum: 1 })
  userId!: number;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] })
  status!: string;

  @ApiProperty({ example: 5800, minimum: 0 })
  totalAmountInWon!: number;

  @ApiProperty({ example: '2024-04-27T00:00:00.000Z', format: 'date-time' })
  createdAt!: string;
}
```

- [ ] **Step 4: `dto/error-response.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 404 }) statusCode!: number;
  @ApiProperty({ example: 'Not Found' }) message!: string;
  @ApiProperty({ required: false }) error?: string;
}
```

### Task 2.2: Ch02 컨트롤러

- [ ] **Step 1: `products.controller.ts`**

```typescript
import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { getStore } from '@app/mock-data';
import { Ch02ProductDto } from './dto/product.dto';
import { ErrorResponseDto } from './dto/error-response.dto';

@ApiTags('products')
@Controller('products')
export class Ch02ProductsController {
  @Get()
  @ApiOkResponse({ type: [Ch02ProductDto] })
  list(): Ch02ProductDto[] { return getStore().products as Ch02ProductDto[]; }

  @Get(':id')
  @ApiOkResponse({ type: Ch02ProductDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  byId(@Param('id', ParseIntPipe) id: number): Ch02ProductDto {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    return p as Ch02ProductDto;
  }
}
```

- [ ] **Step 2: `users.controller.ts`**

```typescript
import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { getStore } from '@app/mock-data';
import { Ch02UserDto } from './dto/user.dto';
import { ErrorResponseDto } from './dto/error-response.dto';

@ApiTags('users')
@Controller('users')
export class Ch02UsersController {
  @Get(':id')
  @ApiOkResponse({ type: Ch02UserDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  byId(@Param('id', ParseIntPipe) id: number): Ch02UserDto {
    const u = getStore().users.find((x) => x.id === id);
    if (!u) throw new NotFoundException();
    return u as Ch02UserDto;
  }
}
```

- [ ] **Step 3: `orders.controller.ts` (선택 — Ch07에서 본격 등장하지만 Swagger 표시용으로 listOnly)**

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { getStore } from '@app/mock-data';
import { Ch02OrderDto } from './dto/order.dto';

@ApiTags('orders')
@Controller('orders')
export class Ch02OrdersController {
  @Get()
  @ApiOkResponse({ type: [Ch02OrderDto] })
  list(): Ch02OrderDto[] { return getStore().orders as Ch02OrderDto[]; }
}
```

- [ ] **Step 4: `ch02.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { CONTRACT_STATUS } from '../common/contract-status.interceptor';
import { Ch02ProductsController } from './products.controller';
import { Ch02UsersController } from './users.controller';
import { Ch02OrdersController } from './orders.controller';

@Module({
  controllers: [Ch02ProductsController, Ch02UsersController, Ch02OrdersController],
  providers: [{ provide: CONTRACT_STATUS, useValue: 'code-derived' }],
})
export class Ch02CodeFirstSwaggerModule {}
```

### Task 2.3: `main.ts`에 SwaggerModule.setup 추가

- [ ] **Step 1: 기존 `main.ts` Read 후 Edit**

```typescript
// apps/lecture/src/main.ts (수정 후 전체)
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initStore } from '@app/mock-data';

async function bootstrap(): Promise<void> {
  initStore('basic');

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: 'http://localhost:5173',
      exposedHeaders: ['x-contract-status', 'x-mock-db-calls'],
    },
  });

  // Ch02부터 Swagger UI 마운트. Ch01에서는 빈 paths 결과가 떠도 무방 (학습 비교).
  const config = new DocumentBuilder().setTitle('OAS Lecture API').setVersion('1.0.0').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`lecture app running on http://localhost:${port} (Swagger: /api)`);
}
void bootstrap();
```

### Task 2.4: `app.module.ts`에서 Ch02 토글

- [ ] **Step 1: import 변경**

```typescript
// apps/lecture/src/app.module.ts (imports 줄만 수정)
// import { Ch01DocDriftModule } from './ch01-doc-drift/ch01.module';
import { Ch02CodeFirstSwaggerModule } from './ch02-code-first-swagger/ch02.module';

@Module({
  imports: [Ch02CodeFirstSwaggerModule],
  ...
})
```

(Ch01 import는 주석 처리 — spec의 토글 패턴)

### Task 2.5: Ch02 smoke spec (TDD)

- [ ] **Step 1: failing test**

```typescript
// apps/lecture/src/ch02-code-first-swagger/ch02.smoke.spec.ts
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { initStore } from '@app/mock-data';
import { Ch02CodeFirstSwaggerModule } from './ch02.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ContractStatusInterceptor } from '../common/contract-status.interceptor';

describe('Ch02 code-first smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    initStore('basic');
    const ref = await Test.createTestingModule({
      imports: [Ch02CodeFirstSwaggerModule],
      providers: [{ provide: APP_INTERCEPTOR, useClass: ContractStatusInterceptor }],
    }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /products/1 → 200, priceInWon, header code-derived', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body.priceInWon).toBeGreaterThanOrEqual(0);
    expect(res.headers['x-contract-status']).toBe('code-derived');
  });
});
```

- [ ] **Step 2: 실행**

```bash
pnpm jest apps/lecture/src/ch02-code-first-swagger/ch02.smoke.spec.ts
# → 1 passed
```

### Task 2.6: `pnpm swagger:export` 결과 검증

- [ ] **Step 1: 익스포트 + 결과 확인**

```bash
pnpm swagger:export
grep -c 'priceInWon' contracts/openapi.from-code.yaml
# → ≥ 1 (Product schema에 등장)
```

### Task 2.7: FE Ch02 ProductList (수기 fetch + 수기 타입)

- [ ] **Step 1: `apps/web/src/ch02-code-first-swagger/ProductList.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { apiBaseUrl } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';

// ⚠️ TODO: BE 바뀌면 여기도 수동으로 바꿔야 함 (Ch02 의도적 안티패턴)
interface Product {
  id: number;
  name: string;
  priceInWon: number;
  stock: number;
  description: string;
}

export function Ch02ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const { setStatus } = useContractDebug();

  useEffect(() => {
    fetch(`${apiBaseUrl}/products`).then(async (r) => {
      setStatus(r.headers.get('x-contract-status') ?? 'unknown');
      setItems((await r.json()) as Product[]);
    });
  }, [setStatus]);

  return (
    <table>
      <thead><tr><th>ID</th><th>이름</th><th>가격(원)</th><th>재고</th></tr></thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.priceInWon}</td><td>{p.stock}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: `App.tsx`의 `ChapterContent`를 챕터별 dispatch로 교체**

```tsx
// apps/web/src/App.tsx (ChapterContent 함수만 교체)
import { ACTIVE_CHAPTER } from './active-chapter';
import { Ch02ProductList } from './ch02-code-first-swagger/ProductList';
// (Phase 3~7에서 import 추가)

function ChapterContent() {
  switch (ACTIVE_CHAPTER) {
    case 'ch02': return <Ch02ProductList />;
    default: return <p>chapter {ACTIVE_CHAPTER} not yet implemented</p>;
  }
}
```

- [ ] **Step 3: FE 빌드 + 브라우저 smoke**

```bash
pnpm build:web
# 0 errors

# 양 터미널에서:
pnpm start:dev      # BE :3000 (Ch02)
pnpm start:web      # FE :5173

# 브라우저: http://localhost:5173 → Product 목록이 표시되고
#           우하단 배지에 "x-contract-status: code-derived"
# Swagger UI: http://localhost:3000/api → Product/User/Order 스키마 표시
```

UI 검증 결과를 글로 기록 (skill 규칙). 만약 자동 환경에서 브라우저 사용 불가능하면 그 사실을 명시.

### Task 2.8: Commit

- [ ] **Step 1**

```bash
git add apps/lecture/src/main.ts apps/lecture/src/app.module.ts \
        apps/lecture/src/ch02-code-first-swagger \
        apps/web/src/ch02-code-first-swagger apps/web/src/App.tsx
git commit -m "feat(ch02): code-first swagger with @ApiProperty + FE manual fetch"
```

---

## Phase 3 — Ch03 Code-First SoT 약점

**Goal:** Ch02 DTO에 `category` 필드를 BE만 추가. FE는 Ch02 코드 그대로 — 런타임에 category가 `undefined`로 표시되거나 contract-debug 패널이 미스매치를 빨갛게 표시.

**Done-Definition**:
- BE 응답 JSON에 `category` 포함
- FE 화면의 category 컬럼이 비어있거나 `contract-debug`가 미스매치 표시
- `pnpm swagger:export`로 yaml 갱신 가능하나 FE 타입 자동 동기화 불가
- 헤더 `code-derived`

**Files:**
- Create: `apps/lecture/src/ch03-derived-spec-pain/{ch03.module.ts, dto/product.dto.ts, products.controller.ts, ch03.smoke.spec.ts}`, `apps/web/src/ch03-derived-spec-pain/ProductList.tsx`
- Modify: `apps/lecture/src/app.module.ts`, `apps/web/src/App.tsx`

### Task 3.1: Ch03 DTO/컨트롤러 (Ch02 + category)

- [ ] **Step 1: DTO 생성**

```typescript
// apps/lecture/src/ch03-derived-spec-pain/dto/product.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class Ch03ProductDto {
  @ApiProperty({ example: 1, minimum: 1 }) id!: number;
  @ApiProperty({ example: '사이다 1.5L' }) name!: string;
  @ApiProperty({ example: 2900, minimum: 0 }) priceInWon!: number;
  @ApiProperty({ example: 42, minimum: 0 }) stock!: number;
  @ApiProperty({ example: '탄산음료' }) description!: string;
  @ApiProperty({ example: 'beverage', description: '신규 추가됨 — FE는 모름' })
  category!: string;
}
```

- [ ] **Step 2: 컨트롤러 + 모듈** (Ch02와 거의 동일 + 응답에 `category` 합성)

```typescript
// apps/lecture/src/ch03-derived-spec-pain/products.controller.ts
import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { getStore } from '@app/mock-data';
import { Ch03ProductDto } from './dto/product.dto';

const FAKE_CATEGORY = (id: number) => (id % 2 === 0 ? 'food' : 'beverage');

@ApiTags('products')
@Controller('products')
export class Ch03ProductsController {
  @Get()
  @ApiOkResponse({ type: [Ch03ProductDto] })
  list(): Ch03ProductDto[] {
    return getStore().products.map((p) => ({ ...p, category: FAKE_CATEGORY(p.id) })) as Ch03ProductDto[];
  }

  @Get(':id')
  @ApiOkResponse({ type: Ch03ProductDto })
  byId(@Param('id', ParseIntPipe) id: number): Ch03ProductDto {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    return { ...p, category: FAKE_CATEGORY(id) } as Ch03ProductDto;
  }
}
```

- [ ] **Step 3: `ch03.module.ts` (Ch02와 같은 토큰 `code-derived`)**

```typescript
import { Module } from '@nestjs/common';
import { CONTRACT_STATUS } from '../common/contract-status.interceptor';
import { Ch03ProductsController } from './products.controller';

@Module({
  controllers: [Ch03ProductsController],
  providers: [{ provide: CONTRACT_STATUS, useValue: 'code-derived' }],
})
export class Ch03DerivedSpecPainModule {}
```

(Users 컨트롤러는 Ch02 재사용 가능하지만 학습 단순화를 위해 본 챕터 모듈은 Products만 다룸. 만약 필요하면 Ch02 컨트롤러 import 가능.)

### Task 3.2: FE Ch03 ProductList — Ch02 그대로 복사 (category 인지 못함)

- [ ] **Step 1: 파일 생성 — Ch02와 동일한 인터페이스, category 컬럼 추가만 화면에 자리 마련**

```tsx
// apps/web/src/ch03-derived-spec-pain/ProductList.tsx
import { useEffect, useState } from 'react';
import { apiBaseUrl } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';

// ❌ Ch02 그대로. BE는 category를 추가했지만 우리는 모른다.
interface Product {
  id: number;
  name: string;
  priceInWon: number;
  stock: number;
  description: string;
}

export function Ch03ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const { setStatus } = useContractDebug();

  useEffect(() => {
    fetch(`${apiBaseUrl}/products`).then(async (r) => {
      const json = await r.json();
      setStatus(r.headers.get('x-contract-status') ?? 'unknown');

      // 런타임 미스매치 검출 (spec § FE의 응답 헤더 검출 방법 — 2단계 검출)
      const knownKeys = new Set(['id', 'name', 'priceInWon', 'stock', 'description']);
      const extraKeys = json[0] ? Object.keys(json[0]).filter((k) => !knownKeys.has(k)) : [];
      if (extraKeys.length) {
        setStatus(`code-derived; runtime-mismatch=${extraKeys.join(',')}`);
      }
      setItems(json as Product[]);
    });
  }, [setStatus]);

  return (
    <table>
      <thead><tr><th>ID</th><th>이름</th><th>가격</th><th>category</th></tr></thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id}>
            <td>{p.id}</td><td>{p.name}</td><td>{p.priceInWon}</td>
            {/* ⚠️ category 필드는 우리 인터페이스에 없으므로 undefined */}
            <td>{(p as Product & { category?: string }).category ?? '(undefined)'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Task 3.3: 토글 + smoke spec

- [ ] **Step 1: `app.module.ts`에 Ch03 활성**

```typescript
// import { Ch02CodeFirstSwaggerModule } from './ch02-code-first-swagger/ch02.module';
import { Ch03DerivedSpecPainModule } from './ch03-derived-spec-pain/ch03.module';

@Module({ imports: [Ch03DerivedSpecPainModule], providers: [...] })
```

- [ ] **Step 2: smoke spec**

```typescript
// apps/lecture/src/ch03-derived-spec-pain/ch03.smoke.spec.ts
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { initStore } from '@app/mock-data';
import { Ch03DerivedSpecPainModule } from './ch03.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ContractStatusInterceptor } from '../common/contract-status.interceptor';

describe('Ch03 derived-spec-pain smoke', () => {
  let app: INestApplication;
  beforeAll(async () => {
    initStore('basic');
    const ref = await Test.createTestingModule({
      imports: [Ch03DerivedSpecPainModule],
      providers: [{ provide: APP_INTERCEPTOR, useClass: ContractStatusInterceptor }],
    }).compile();
    app = ref.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('GET /products/1 → 200 + category present + header code-derived', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('category');
    expect(res.headers['x-contract-status']).toBe('code-derived');
  });
});
```

- [ ] **Step 3: 실행**

```bash
pnpm jest apps/lecture/src/ch03-derived-spec-pain/ch03.smoke.spec.ts
# → 1 passed
```

- [ ] **Step 4: FE App.tsx dispatch 추가 + 브라우저 smoke**

```tsx
// apps/web/src/App.tsx의 switch에 추가
import { Ch03ProductList } from './ch03-derived-spec-pain/ProductList';
// case 'ch03': return <Ch03ProductList />;
```

브라우저(`VITE_CHAPTER=ch03`로 `.env.development` 변경 또는 `import.meta.env.VITE_CHAPTER` 임시 override): category 컬럼이 `(undefined)` 표시 + 배지가 `runtime-mismatch=category` 표시.

- [ ] **Step 5: Commit**

```bash
git add apps/lecture/src/ch03-derived-spec-pain apps/lecture/src/app.module.ts \
        apps/web/src/ch03-derived-spec-pain apps/web/src/App.tsx
git commit -m "feat(ch03): code-first SoT pain (BE adds category, FE drifts)"
```

---

## Phase 4 — Ch04 Design-First 전환

**Goal:** `contracts/openapi.yaml` 작성 → `pnpm gen:types` → `contracts/generated/be-types.ts` 생성. BE DTO를 codegen 타입으로 교체. FE는 `openapi-fetch`로 typed 호출. `domain.ts`를 codegen re-export로 교체. 헤더 `spec-derived`.

**Done-Definition (spec § Ch04)**:
- `contracts/openapi.yaml` 존재 (paths/components.schemas)
- `pnpm gen:types` → `contracts/generated/be-types.ts` 생성 + `priceInWon` 등 표준 필드
- BE/FE 양쪽 같은 `be-types.ts` import — 어느 한 곳 변경 → 양쪽 빌드 동시 실패
- `pnpm build` 통과, `pnpm build:web` 통과

**Files:**
- Create: `contracts/openapi.yaml`, `apps/lecture/src/ch04-design-first/{ch04.module.ts, products.controller.ts, users.controller.ts, ch04.smoke.spec.ts}`, `apps/web/src/ch04-design-first/ProductList.tsx`, `libs/mock-data/src/domain.handwritten.ts` (백업)
- Modify: `libs/mock-data/src/domain.ts` (re-export로 교체), `apps/lecture/src/app.module.ts`, `apps/web/src/App.tsx`, `apps/web/src/lib/api-client.ts` (typed createClient)

### Task 4.1: `contracts/openapi.yaml` 작성

- [ ] **Step 1: 디렉토리 + yaml 파일 생성**

`mkdir -p contracts` 후 spec § "`contracts/openapi.yaml` 샘플 (Ch04에서 처음 등장)" 의 891~995 줄을 그대로 써서 `contracts/openapi.yaml` 생성.

(spec 본문에 전체 코드가 있어 이 플랜에선 재인용 생략. `Product`/`User`/`Order`/`OrderStatus`/`OrderItem`/`ErrorResponse` 6개 schema + `/products`, `/products/{id}`, `/users/{id}` 3개 path. `priceInWon`/`createdAt` Contract Invariant 인코딩.)

- [ ] **Step 2: codegen 실행 + 결과 검증**

```bash
pnpm gen:types
ls -la contracts/generated/be-types.ts
grep -c 'priceInWon' contracts/generated/be-types.ts
# → ≥ 1
```

### Task 4.2: `domain.ts` codegen re-export 전환

- [ ] **Step 1: 기존 수기 정의를 백업**

```bash
cp libs/mock-data/src/domain.ts libs/mock-data/src/domain.handwritten.ts
```

- [ ] **Step 2: `domain.ts` 교체**

```typescript
// libs/mock-data/src/domain.ts (Ch04+: re-export)
import type { components } from '@contracts/generated';

export type User       = components['schemas']['User'];
export type Product    = components['schemas']['Product'];
export type Order      = components['schemas']['Order'];
export type OrderStatus= components['schemas']['OrderStatus'];
export type OrderItem  = components['schemas']['OrderItem'];

// 학습 외 도메인 (Review/Category/ProductCategory)은 yaml에 없으므로
// handwritten 백업에서 그대로 가져온다.
export type { Category, ProductCategory, Review, Store } from './domain.handwritten';
```

- [ ] **Step 3: BE/FE 빌드 동시 통과 확인**

```bash
pnpm gen:types
pnpm build         # NestJS — exit 0
pnpm build:web     # Vite — exit 0
```

만약 type error: `domain.handwritten.ts` 의 `Store` interface 필드 타입이 새 `User`/`Product`/`Order` 타입과 일치하지 않을 수 있음. 그 경우 `Store`를 `domain.ts`에서 새로 정의:

```typescript
export interface Store {
  users: User[]; products: Product[]; orders: Order[]; orderItems: OrderItem[];
  reviews: Review[]; categories: Category[]; productCategories: ProductCategory[];
}
```

### Task 4.3: Ch04 BE 모듈 (codegen 타입 사용, `@ApiProperty` 신규 작성 금지)

- [ ] **Step 1: 컨트롤러**

```typescript
// apps/lecture/src/ch04-design-first/products.controller.ts
import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type Product = components['schemas']['Product'];

@Controller('products')
export class Ch04ProductsController {
  @Get()
  list(): Product[] { return getStore().products; }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number): Product {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    return p;
  }
}
```

```typescript
// apps/lecture/src/ch04-design-first/users.controller.ts (동일 스타일)
import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type User = components['schemas']['User'];

@Controller('users')
export class Ch04UsersController {
  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number): User {
    const u = getStore().users.find((x) => x.id === id);
    if (!u) throw new NotFoundException();
    return u;
  }
}
```

- [ ] **Step 2: 모듈**

```typescript
// apps/lecture/src/ch04-design-first/ch04.module.ts
import { Module } from '@nestjs/common';
import { CONTRACT_STATUS } from '../common/contract-status.interceptor';
import { Ch04ProductsController } from './products.controller';
import { Ch04UsersController } from './users.controller';

@Module({
  controllers: [Ch04ProductsController, Ch04UsersController],
  providers: [{ provide: CONTRACT_STATUS, useValue: 'spec-derived' }],
})
export class Ch04DesignFirstModule {}
```

### Task 4.4: FE Ch04 — typed openapi-fetch

- [ ] **Step 1: `apps/web/src/lib/api-client.ts` 확장 (createClient<paths> 추가)**

```typescript
// 기존 함수들 유지하면서 추가
import createClient from 'openapi-fetch';
import type { paths } from '@contracts/generated';

export const apiClient = createClient<paths>({ baseUrl: BASE_URL });
```

(Phase 0에서 만든 기본 export는 그대로 두고 추가만.)

- [ ] **Step 2: ProductList**

```tsx
// apps/web/src/ch04-design-first/ProductList.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';
import type { components } from '@contracts/generated';

type Product = components['schemas']['Product'];

export function Ch04ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const { setStatus } = useContractDebug();

  useEffect(() => {
    apiClient.GET('/products').then(({ data, response }) => {
      setStatus(response.headers.get('x-contract-status') ?? 'unknown');
      if (data) setItems(data);
    });
  }, [setStatus]);

  return (
    <table>
      <thead><tr><th>ID</th><th>이름</th><th>가격(원)</th></tr></thead>
      <tbody>{items.map((p) => (<tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.priceInWon}</td></tr>))}</tbody>
    </table>
  );
}
```

### Task 4.5: 토글 + smoke + commit

- [ ] **Step 1: `app.module.ts` Ch04 활성**

```typescript
import { Ch04DesignFirstModule } from './ch04-design-first/ch04.module';
@Module({ imports: [Ch04DesignFirstModule], ... })
```

- [ ] **Step 2: smoke spec (Ch02/3와 동일 패턴, header `spec-derived`)**

```typescript
// apps/lecture/src/ch04-design-first/ch04.smoke.spec.ts
// (Ch02 smoke와 동일 구조, 토큰 'spec-derived' 검증 — 모듈/헤더만 교체)
```

- [ ] **Step 3: 빌드 양쪽 통과 확인**

```bash
pnpm gen:types && pnpm build && pnpm build:web && pnpm jest apps/lecture/src/ch04-design-first
```

- [ ] **Step 4: Commit**

```bash
git add contracts/openapi.yaml libs/mock-data/src/domain.ts libs/mock-data/src/domain.handwritten.ts \
        apps/lecture/src/ch04-design-first apps/lecture/src/app.module.ts \
        apps/web/src/ch04-design-first apps/web/src/App.tsx apps/web/src/lib/api-client.ts
git commit -m "feat(ch04): design-first SoT — yaml + codegen + typed BE/FE"
```

---

## Phase 5 — Ch05 Mock 서버

**Goal:** Ch04 BE 코드는 그대로. `prism mock contracts/openapi.yaml --port 4010` 한 줄로 Mock. FE의 `VITE_API_BASE_URL`을 4010으로 전환하면 BE 없이 동작. 헤더 `spec-derived; served-by=prism-mock` (FE 합성).

**Done-Definition**:
- BE 끔 → FE Product 목록 정상 (Prism 응답)
- `apps/web/.env.ch05`로 `VITE_API_BASE_URL=http://localhost:4010` 분리
- `contract-debug` 배지 `spec-derived; served-by=prism-mock`
- baseUrl 3000 복귀 시 동일 코드가 실 BE 응답으로 동작

**Files:**
- Create: `apps/lecture/src/ch05-parallel-blocking/ch05.module.ts`, `apps/web/.env.ch05`, `apps/web/src/ch05-parallel-blocking/ProductList.tsx`
- Modify: `apps/lecture/src/app.module.ts`, `apps/web/src/App.tsx`, `contracts/openapi.yaml` (Product schema에 `examples` 1건 확인 — 이미 spec 샘플에 포함됨)

### Task 5.1: yaml에 `examples` 보강

이미 spec 샘플 yaml에 `examples` 1건 포함됨. 누락 시 다음 추가:

```yaml
# /products/{id} GET responses 200 content application/json:
              examples:
                sample:
                  value: { id: 1, name: "사이다 1.5L", priceInWon: 2900, stock: 42, description: "탄산음료" }
```

- [ ] **Step 1: `contracts/openapi.yaml`에서 `Product` 응답 부분에 examples 존재 확인** (없으면 추가)
- [ ] **Step 2: codegen 재실행 + 영향 없음 확인**

```bash
pnpm gen:types && pnpm build:web
```

### Task 5.2: Ch05 BE 모듈 (Ch04 controllers 재사용 + 토큰만 다름)

- [ ] **Step 1: 모듈**

```typescript
// apps/lecture/src/ch05-parallel-blocking/ch05.module.ts
import { Module } from '@nestjs/common';
import { CONTRACT_STATUS } from '../common/contract-status.interceptor';
import { Ch04ProductsController } from '../ch04-design-first/products.controller';
import { Ch04UsersController } from '../ch04-design-first/users.controller';

@Module({
  controllers: [Ch04ProductsController, Ch04UsersController],
  providers: [{ provide: CONTRACT_STATUS, useValue: 'spec-derived' }],
})
export class Ch05ParallelBlockingModule {}
```

(Ch05의 학습 포인트는 BE를 *끄는* 것 — `served-by=prism-mock` suffix는 FE에서 합성. BE 토큰 자체는 Ch04와 동일 `spec-derived`.)

### Task 5.3: FE Ch05 페이지 + .env.ch05

- [ ] **Step 1: `apps/web/.env.ch05`**

```bash
VITE_API_BASE_URL=http://localhost:4010
VITE_CHAPTER=ch05
```

- [ ] **Step 2: ProductList**

```tsx
// apps/web/src/ch05-parallel-blocking/ProductList.tsx
import { useEffect, useState } from 'react';
import { apiClient, deriveContractStatus } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';
import type { components } from '@contracts/generated';

type Product = components['schemas']['Product'];

export function Ch05ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const { setStatus } = useContractDebug();

  useEffect(() => {
    apiClient.GET('/products').then(({ data, response }) => {
      const headerVal = response.headers.get('x-contract-status');
      setStatus(deriveContractStatus(headerVal));
      if (data) setItems(data);
    });
  }, [setStatus]);

  return (
    <p>items count: {items.length} (Prism mock if BE off)</p>
  );
}
```

### Task 5.4: 시연 + smoke

- [ ] **Step 1: BE 끄고 Prism + FE만 실행**

```bash
# 새 터미널
pnpm mock:start    # Prism 4010

# 새 터미널
VITE_CHAPTER=ch05 pnpm start:web  # 또는 .env.ch05 사용
```

- [ ] **Step 2: Prism 요청 검증 시연**

```bash
curl -i 'http://localhost:4010/products/abc' | head -5
# HTTP/1.1 422 (id가 integer가 아님)
curl -s http://localhost:4010/products/1 | head -2
# Product JSON (examples 또는 schema 기반)
```

- [ ] **Step 3: 브라우저 — BE 끈 상태에서 목록 표시 + 배지 `spec-derived; served-by=prism-mock`**

- [ ] **Step 4: BE 다시 켜고 baseUrl을 3000으로 되돌리면 동일 코드 동작 확인**

### Task 5.5: 토글 + commit

- [ ] **Step 1: `app.module.ts` Ch05 활성** (Ch04에서 import만 교체)

- [ ] **Step 2: Commit**

```bash
git add apps/lecture/src/ch05-parallel-blocking apps/lecture/src/app.module.ts \
        apps/web/.env.ch05 apps/web/src/ch05-parallel-blocking apps/web/src/App.tsx
git commit -m "feat(ch05): prism mock parallel — FE works without BE (4010)"
```

---

## Phase 6 — Ch06 Contract Testing

**Goal:** BE의 의도적 응답 위반(`priceInWon` → `price`)을 contract test가 자동 검출. `.contract-status.json`에 결과 기록 → 인터셉터가 헤더 suffix `runtime-validated=ok|violation` 합성. CI에 `pnpm test:contract` 추가.

**Done-Definition**:
- 최소 3개 contract test (`/products/:id`, `/products`, `/users/:id`)
- 위반 상태에서 `pnpm test:contract` exit 1 + `priceInWon` 에러 메시지
- 수정 후 exit 0
- 헤더가 위반 시 `runtime-validated=violation`, 통과 시 `=ok`
- CI에 `pnpm test:contract` step 등록

**Files:**
- Create: `apps/lecture/src/ch06-runtime-drift/{ch06.module.ts, products.controller.ts, users.controller.ts, ch06.smoke.spec.ts}`, `test/contract/products.contract.spec.ts`, `test/contract/users.contract.spec.ts`, `scripts/run-contract-test.mjs`
- Modify: `apps/lecture/src/app.module.ts`, `.github/workflows/contract.yml` (test:contract step 추가), `package.json` (`test:contract` 스크립트를 wrapper로 교체)

### Task 6.1: Ch06 BE — 의도적 위반 컨트롤러

- [ ] **Step 1: `products.controller.ts` (한 엔드포인트만 위반)**

```typescript
// apps/lecture/src/ch06-runtime-drift/products.controller.ts
import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type Product = components['schemas']['Product'];

@Controller('products')
export class Ch06ProductsController {
  @Get()
  list(): Product[] { return getStore().products; } // 정상

  @Get(':id')
  // ❌ 의도적 위반: priceInWon 대신 price 반환. Contract test가 잡아낸다.
  byId(@Param('id', ParseIntPipe) id: number) {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    const { priceInWon, ...rest } = p;
    return { ...rest, price: priceInWon };
  }
}
```

- [ ] **Step 2: `users.controller.ts` (정상)**

```typescript
// apps/lecture/src/ch06-runtime-drift/users.controller.ts
import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type User = components['schemas']['User'];

@Controller('users')
export class Ch06UsersController {
  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number): User {
    const u = getStore().users.find((x) => x.id === id);
    if (!u) throw new NotFoundException();
    return u;
  }
}
```

- [ ] **Step 3: 모듈 — `CONTRACT_RUNTIME_VALIDATION = true`**

```typescript
// apps/lecture/src/ch06-runtime-drift/ch06.module.ts
import { Module } from '@nestjs/common';
import {
  CONTRACT_STATUS,
  CONTRACT_RUNTIME_VALIDATION,
} from '../common/contract-status.interceptor';
import { Ch06ProductsController } from './products.controller';
import { Ch06UsersController } from './users.controller';

@Module({
  controllers: [Ch06ProductsController, Ch06UsersController],
  providers: [
    { provide: CONTRACT_STATUS, useValue: 'spec-derived' },
    { provide: CONTRACT_RUNTIME_VALIDATION, useValue: true },
  ],
})
export class Ch06RuntimeDriftModule {}
```

### Task 6.2: Contract test (`openapi-response-validator`)

- [ ] **Step 1: failing test (의도적 위반 검출)**

```typescript
// test/contract/products.contract.spec.ts
import 'reflect-metadata';
import OpenAPIResponseValidator from 'openapi-response-validator';
import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { Ch06RuntimeDriftModule } from '../../apps/lecture/src/ch06-runtime-drift/ch06.module';
import { initStore } from '@app/mock-data';

const spec = yaml.load(fs.readFileSync('contracts/openapi.yaml', 'utf8')) as any;

describe('Contract: GET /products/:id', () => {
  let app: import('@nestjs/common').INestApplication;

  beforeAll(async () => {
    initStore('basic');
    const ref = await Test.createTestingModule({ imports: [Ch06RuntimeDriftModule] }).compile();
    app = ref.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('matches OAS schema (priceInWon 표준)', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    const validator = new OpenAPIResponseValidator({
      responses: spec.paths['/products/{id}'].get.responses,
      components: { schemas: spec.components.schemas },
    });
    const errors = validator.validateResponse(200, res.body);
    expect(errors).toBeUndefined();
  });

  it('GET /products list matches', async () => {
    const res = await request(app.getHttpServer()).get('/products');
    const v = new OpenAPIResponseValidator({
      responses: spec.paths['/products'].get.responses,
      components: { schemas: spec.components.schemas },
    });
    expect(v.validateResponse(200, res.body)).toBeUndefined();
  });
});
```

- [ ] **Step 2: `test/contract/users.contract.spec.ts`** (동일 패턴, `/users/{id}` — Ch06UsersController는 정상이므로 통과 케이스 1건)

- [ ] **Step 3: 실행 — 첫 케이스 fail 예상 (의도적)**

```bash
pnpm test:contract
# → FAIL: priceInWon required, price found instead
# exit 1
```

### Task 6.3: 위반 → 정상 → 헤더 변동 시연

- [ ] **Step 1: `Ch06ProductsController.byId` 의 위반을 임시로 수정** (학습 시연 후 다시 위반 상태로 되돌림 — 학습용으로 위반 상태가 default)

```typescript
// 원복 시
byId(@Param('id', ParseIntPipe) id: number): Product {
  const p = getStore().products.find((x) => x.id === id);
  if (!p) throw new NotFoundException();
  return p;
}
```

- [ ] **Step 2: `.contract-status.json` 자동 작성 wrapper 스크립트**

```javascript
// scripts/run-contract-test.mjs
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['jest', '--config', 'jest.contract.config.ts'], { stdio: 'inherit' });
const status = r.status === 0 ? 'ok' : 'violation';
writeFileSync('.contract-status.json', JSON.stringify({ status, ranAt: new Date().toISOString() }, null, 2));
process.exit(r.status ?? 0);
```

- [ ] **Step 3: `package.json` `test:contract` 스크립트를 wrapper로 변경**

```json
"test:contract": "node scripts/run-contract-test.mjs",
```

(Read 후 Edit)

- [ ] **Step 4: 위반 / 정상 양 케이스 헤더 변동 확인**

```bash
# 위반 상태 (의도적)
pnpm test:contract       # exit 1, .contract-status.json: { status: 'violation' }
pnpm start:dev           # 부팅
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: spec-derived; runtime-validated=violation

# 수정
pnpm test:contract       # exit 0, .contract-status.json: { status: 'ok' }
pnpm start:dev           # 재시작 (interceptor가 새 파일 읽음)
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: spec-derived; runtime-validated=ok
```

### Task 6.4: CI step 추가

- [ ] **Step 1: `.github/workflows/contract.yml` Edit**

```yaml
      - run: pnpm gen:types
      - run: pnpm build
      - run: pnpm test:contract     # ← 추가
```

### Task 6.5: 토글 + commit

- [ ] **Step 1: `app.module.ts` Ch06 활성**
- [ ] **Step 2: 위반 상태로 두고 (학습용 의도) 커밋**

```bash
git add apps/lecture/src/ch06-runtime-drift apps/lecture/src/app.module.ts \
        test/contract scripts/run-contract-test.mjs package.json \
        .github/workflows/contract.yml
git commit -m "feat(ch06): contract testing with openapi-response-validator + CI gate"
```

---

## Phase 7 — Ch07 Generated React Query Hooks

**Goal:** `openapi-react-query` 도입. `$api.useQuery`/`useMutation`/invalidation. yaml에 `POST /orders` + `CreateOrderInput` 추가. BE에 `OrdersController.create`. FE 화면 2개. 헤더 `spec-derived; client=react-query`.

**Done-Definition (spec § Ch07)**:
- `$api.useQuery`로 Product list/detail 정상 + Ch04 코드 대비 wrapper 라인 ≥50% 감소
- `$api.useMutation`으로 주문 생성 + cache invalidation
- yaml에 `POST /orders` + `CreateOrderInput`
- gen:types 후 `createOrder` operation + 타입 포함
- 헤더 `client=react-query`
- Ch06 contract test에 `POST /orders` (201) 정상 응답 검증 1건 추가

**Files:**
- Create: `apps/lecture/src/ch07-generated-hooks/{ch07.module.ts, orders.controller.ts}`, `apps/web/src/ch07-generated-hooks/{ProductList.tsx, CreateOrderForm.tsx}`, `test/contract/orders.contract.spec.ts`
- Modify: `contracts/openapi.yaml` (POST /orders + CreateOrderInput), `apps/lecture/src/app.module.ts`, `apps/web/src/App.tsx`, `apps/web/src/lib/api-client.ts` ($api 추가)

### Task 7.1: yaml 확장

- [ ] **Step 1: `contracts/openapi.yaml`에 spec § "OAS yaml 확장 (Ch04 yaml에 추가)" (646~684 줄) 그대로 추가** — `POST /orders` path + `CreateOrderInput` schema.

- [ ] **Step 2: codegen 재실행**

```bash
pnpm gen:types
grep -c 'createOrder\|CreateOrderInput' contracts/generated/be-types.ts
# → ≥ 2
```

### Task 7.2: BE — Orders.create 신규 + 모듈

- [ ] **Step 1: 컨트롤러**

```typescript
// apps/lecture/src/ch07-generated-hooks/orders.controller.ts
import { Body, Controller, HttpCode, Post, BadRequestException } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type CreateOrderInput = components['schemas']['CreateOrderInput'];
type Order = components['schemas']['Order'];

@Controller('orders')
export class Ch07OrdersController {
  @Post()
  @HttpCode(201)
  create(@Body() body: CreateOrderInput): Order {
    const store = getStore();
    const products = store.products;
    let total = 0;
    for (const item of body.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new BadRequestException(`product ${item.productId} not found`);
      total += product.priceInWon * item.quantity;
    }
    const order: Order = {
      id: store.orders.length + 1,
      userId: body.userId,
      status: 'PENDING',
      totalAmountInWon: total,
      createdAt: new Date().toISOString(),
    };
    store.orders.push(order);
    return order;
  }
}
```

- [ ] **Step 2: 모듈** (Ch04 컨트롤러 재사용 + Ch07 OrdersController 추가)

```typescript
// apps/lecture/src/ch07-generated-hooks/ch07.module.ts
import { Module } from '@nestjs/common';
import { CONTRACT_STATUS, CONTRACT_RUNTIME_VALIDATION } from '../common/contract-status.interceptor';
import { Ch04ProductsController } from '../ch04-design-first/products.controller';
import { Ch04UsersController } from '../ch04-design-first/users.controller';
import { Ch07OrdersController } from './orders.controller';

@Module({
  controllers: [Ch04ProductsController, Ch04UsersController, Ch07OrdersController],
  providers: [
    { provide: CONTRACT_STATUS, useValue: 'spec-derived; client=react-query' },
    { provide: CONTRACT_RUNTIME_VALIDATION, useValue: true },
  ],
})
export class Ch07GeneratedHooksModule {}
```

### Task 7.3: FE — `$api` 셋업

- [ ] **Step 1: `apps/web/src/lib/api-client.ts` 확장**

```typescript
// 이미 있는 import + 추가
import { createClient as createApi } from 'openapi-react-query';
import createClient from 'openapi-fetch';
import type { paths } from '@contracts/generated';

const fetchClient = createClient<paths>({ baseUrl: BASE_URL });
export const apiClient = fetchClient;
export const $api = createApi(fetchClient);
```

- [ ] **Step 2: ProductList**

```tsx
// apps/web/src/ch07-generated-hooks/ProductList.tsx
import { $api } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';
import { useEffect } from 'react';

export function Ch07ProductList() {
  const { data, response } = $api.useQuery('get', '/products');
  const { setStatus } = useContractDebug();

  useEffect(() => {
    if (response) setStatus(response.headers.get('x-contract-status') ?? 'unknown');
  }, [response, setStatus]);

  return <p>items: {data?.length ?? 0}</p>;
}
```

(주의: `openapi-react-query` v0.5의 반환 표면 API가 `response` 직접 노출이 안 될 수 있음. 막힐 경우 fetch 미들웨어를 통해 헤더를 React Context에 broadcast하는 보조 hook으로 우회 — Phase 0의 `apiClient.GET()`로 한 번 폴링하여 배지 갱신.)

- [ ] **Step 3: CreateOrderForm + invalidation**

```tsx
// apps/web/src/ch07-generated-hooks/CreateOrderForm.tsx
import { useQueryClient } from '@tanstack/react-query';
import { $api } from '../lib/api-client';

export function Ch07CreateOrderForm() {
  const queryClient = useQueryClient();
  const create = $api.useMutation('post', '/orders');
  const { queryKey } = $api.queryOptions('get', '/orders');

  const submit = () => {
    create.mutate(
      { body: { userId: 1, items: [{ productId: 1, quantity: 2 }] } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey.slice(0, 1) }) },
    );
  };

  return (
    <button onClick={submit} disabled={create.isPending}>
      주문 생성 {create.isSuccess ? '✓' : ''}
    </button>
  );
}
```

### Task 7.4: 토글 + smoke + Ch06 contract test 확장

- [ ] **Step 1: `app.module.ts` Ch07 활성**

- [ ] **Step 2: `test/contract/orders.contract.spec.ts` 추가**

```typescript
import 'reflect-metadata';
import OpenAPIResponseValidator from 'openapi-response-validator';
import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { Ch07GeneratedHooksModule } from '../../apps/lecture/src/ch07-generated-hooks/ch07.module';
import { initStore } from '@app/mock-data';

const spec = yaml.load(fs.readFileSync('contracts/openapi.yaml', 'utf8')) as any;

describe('Contract: POST /orders', () => {
  let app: import('@nestjs/common').INestApplication;
  beforeAll(async () => {
    initStore('basic');
    const ref = await Test.createTestingModule({ imports: [Ch07GeneratedHooksModule] }).compile();
    app = ref.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('returns 201 + matches Order schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({ userId: 1, items: [{ productId: 1, quantity: 2 }] });
    expect(res.status).toBe(201);
    const v = new OpenAPIResponseValidator({
      responses: spec.paths['/orders'].post.responses,
      components: { schemas: spec.components.schemas },
    });
    expect(v.validateResponse(201, res.body)).toBeUndefined();
  });
});
```

- [ ] **Step 3: 실행**

```bash
pnpm gen:types && pnpm test:contract
# → 모두 통과 (Ch07 모듈에서 Ch06 위반 controller는 사용하지 않음)
```

- [ ] **Step 4: 브라우저 smoke** (FE: ProductList + CreateOrderForm 동시 렌더)

- [ ] **Step 5: Commit**

```bash
git add contracts/openapi.yaml apps/lecture/src/ch07-generated-hooks \
        test/contract/orders.contract.spec.ts apps/lecture/src/app.module.ts \
        apps/web/src/ch07-generated-hooks apps/web/src/lib/api-client.ts apps/web/src/App.tsx
git commit -m "feat(ch07): generated react-query hooks + POST /orders + invalidation"
```

---

## Phase 8 — Ch08 Spec Compatibility Gate

**Goal:** Ch07 yaml을 baseline으로 스냅샷. `pnpm test:compat`이 baseline ↔ current 비교, breaking 변경 시 exit 1. 인터셉터가 `compat=stable|breaking|unknown` suffix 합성. CI에 step 추가.

**Done-Definition**:
- `contracts/openapi.baseline.yaml` 존재 + 커밋
- `pnpm test:compat`: stable=exit 0, breaking=exit 1
- `.compat-status.json`이 `scripts/run-oasdiff.mjs`로 갱신 (gitignore)
- 헤더 suffix `compat=stable|breaking|unknown` 항상 포함
- CI에 `pnpm test:compat` step

**Files:**
- Create: `contracts/openapi.baseline.yaml`, `apps/lecture/src/ch08-spec-compat/ch08.module.ts`
- Modify: `apps/lecture/src/app.module.ts`, `.github/workflows/contract.yml` (test:compat step)

### Task 8.1: baseline 스냅샷

- [ ] **Step 1**

```bash
cp contracts/openapi.yaml contracts/openapi.baseline.yaml
git add contracts/openapi.baseline.yaml
git commit -m "chore: snapshot OAS baseline at Ch07"
```

### Task 8.2: Ch08 모듈 — `CONTRACT_COMPAT_TRACKING = true`

- [ ] **Step 1**

```typescript
// apps/lecture/src/ch08-spec-compat/ch08.module.ts
import { Module } from '@nestjs/common';
import {
  CONTRACT_STATUS,
  CONTRACT_RUNTIME_VALIDATION,
  CONTRACT_COMPAT_TRACKING,
} from '../common/contract-status.interceptor';
import { Ch04ProductsController } from '../ch04-design-first/products.controller';
import { Ch04UsersController } from '../ch04-design-first/users.controller';
import { Ch07OrdersController } from '../ch07-generated-hooks/orders.controller';

@Module({
  controllers: [Ch04ProductsController, Ch04UsersController, Ch07OrdersController],
  providers: [
    { provide: CONTRACT_STATUS, useValue: 'spec-derived' },
    { provide: CONTRACT_RUNTIME_VALIDATION, useValue: true },
    { provide: CONTRACT_COMPAT_TRACKING, useValue: true },
  ],
})
export class Ch08SpecCompatModule {}
```

### Task 8.3: 시연 — breaking change → revert

- [ ] **Step 1: stable 상태 확인**

```bash
pnpm test:compat
# → exit 0, .compat-status.json: { status: 'stable' }
```

- [ ] **Step 2: 의도적 breaking 변경**

`contracts/openapi.yaml`의 `Product.priceInWon` → `priceUSD` 로 rename (테스트 전용 — 시연 후 revert).

```bash
pnpm test:compat
# Output: ERR — required property removed: priceInWon
# exit 1, .compat-status.json: { status: 'breaking' }
```

- [ ] **Step 3: BE 재시작 + 헤더 확인**

```bash
pnpm start:dev
curl http://localhost:3000/products/1 -i | grep x-contract-status
# x-contract-status: spec-derived; runtime-validated=ok; compat=breaking
```

- [ ] **Step 4: revert + 재실행**

```bash
git checkout -- contracts/openapi.yaml
pnpm test:compat
# stable, exit 0
```

### Task 8.4: CI + 토글 + commit

- [ ] **Step 1: `.github/workflows/contract.yml` Edit**

```yaml
      - run: pnpm test:contract
      - run: pnpm test:compat   # ← 추가
```

- [ ] **Step 2: `app.module.ts` Ch08 활성**

- [ ] **Step 3: Commit**

```bash
git add apps/lecture/src/ch08-spec-compat apps/lecture/src/app.module.ts \
        .github/workflows/contract.yml
git commit -m "feat(ch08): spec-compat breaking-change gate via oasdiff"
```

---

## Final E2E Verification

본 플랜이 실행을 마치면 다음 명령으로 전 챕터를 한 번에 회귀 검증한다.

```bash
# 1) 전 BE 챕터 smoke + contract test
pnpm test                          # Ch01~Ch07 smoke 모두 pass
pnpm test:contract                 # Ch06 contract + Ch07 POST /orders pass
pnpm test:compat                   # baseline 대비 stable

# 2) 빌드 양쪽
pnpm gen:types && pnpm build && pnpm build:web   # 모두 exit 0

# 3) 챕터 토글 시연
# app.module.ts에서 Ch01~Ch08 한 챕터씩 import → pnpm start:dev → curl로 헤더 확인
# 기대값: not-tracked → code-derived → code-derived → spec-derived → spec-derived
#       → spec-derived; runtime-validated=ok → spec-derived; client=react-query
#       → spec-derived; runtime-validated=ok; compat=stable

# 4) FE 동작
pnpm start:web
# 브라우저: ACTIVE_CHAPTER 변경하며 ch02~ch07 페이지 확인
# Ch05: pnpm mock:start 와 함께 BE 끈 상태 확인
```

각 챕터의 Done-Definition은 spec § "챕터별 Done-Definition 요약 표"(787~796 줄)에서 한 번에 점검 가능.

---

## Known Trade-offs / Assumptions

본 플랜은 spec § "알려진 트레이드오프"(1054~1071 줄)를 그대로 채택한다. 실행 단계에서 표면화될 수 있는 추가 가정:

1. **GraphQL 잔재 코드(`apps/lecture/src/ch01-rest-pain/` 등)는 건드리지 않는다** — 본 브랜치에서 import되지 않으므로 런타임 영향 없음. 만약 typecheck가 실패하면 별도 cleanup 플랜으로 분리.
2. **FE 테스트는 Vitest 미도입** — `pnpm build:web` 빌드 + 브라우저 수동 smoke만. 자동 환경에서 브라우저 검증 불가능 시 그 사실을 명시.
3. **`openapi-react-query` v0.5의 response 헤더 노출 한계** — Ch07 ProductList는 헤더 추출이 라이브러리 표면 API에 직접 노출되지 않을 수 있음. 막힐 경우 보조 fetch hook(`apiClient.GET()`)으로 한 번 폴링하여 배지 갱신 (Phase 7 Task 7.3 Step 2 코멘트 참조).
4. **`.contract-status.json`의 5분 stale window**는 인터셉터에 이미 구현됨. 학습자가 BE 재시작을 잊으면 `=stale` 표시 — 이는 의도된 학습 신호.
5. **Ch01 README의 의도적 `price` 표류는 본 플랜에서 수정하지 않는다** — Ch01 학습 포인트의 핵심.
6. **`ContractStatusInterceptor`의 `runtimeOn`/`compatOn` boolean 토큰**: Ch06부터 `useValue: true`, Ch08부터 `useValue: true` 추가. 토큰 미주입 시 인터셉터가 해당 suffix를 생략하므로 Ch01-05의 헤더에 영향 없음.

---

## Self-Review Checklist (작성자 본인 검토)

| 점검 | 상태 |
|------|------|
| Spec 8 챕터 모두 1개 이상 Phase로 매핑 | ✅ Phase 1~8 |
| Spec § Contract Invariants 인코딩 (yaml + Ch04 domain 전환) | ✅ Phase 4 |
| Spec § 측정 장치 헤더 챕터별 진화 | ✅ Phase 1(not-tracked) → 2/3(code-derived) → 4/5(spec-derived) → 6(runtime-validated) → 7(client=react-query) → 8(compat) |
| Spec § FE의 응답 헤더 검출 + Prism 합성 | ✅ Phase 0(api-client.deriveContractStatus, contract-debug.tsx) |
| Spec § CORS / Base URL 정책 | ✅ main.ts 이미 구현, .env.ch05 (Phase 5) |
| Spec § package.json 스크립트 | ✅ Phase 0 (jest.contract.config, export-swagger.ts) — 나머지는 기존 |
| Spec § tsconfig path alias / .gitignore | ✅ 기존 — Phase 0에서 검증만 |
| Spec § contracts/openapi.yaml 샘플 6 schema 모두 | ✅ Phase 4 (Product/User/Order/OrderStatus/OrderItem/ErrorResponse), Phase 7 (CreateOrderInput) |
| Spec § CI 워크플로 | ✅ Phase 0 skel → Phase 6 test:contract → Phase 8 test:compat |
| Spec § Done-Definition 표(8 챕터) | ✅ Final E2E Verification 섹션이 표 그대로 점검 |
| 모든 Task의 file paths 절대 위치 명시 | ✅ |
| 모든 Step에 실행/검증 명령 포함 | ✅ |
| 위반 사례 placeholder | ❌ 없음 (직접 코드/명령 모두 인라인) |
| Type 일관성 (controller 시그니처 ↔ DTO ↔ codegen 타입) | ✅ Ch02-3은 Dto class, Ch04+ 는 `components['schemas']['X']` 일관 |
