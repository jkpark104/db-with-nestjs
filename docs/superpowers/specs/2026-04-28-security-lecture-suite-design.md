# Security Lecture Suite — 학습 프로젝트 설계서

> **For agentic workers:** 이 spec을 기반으로 `superpowers:writing-plans` 스킬로 구현 플랜을 작성하세요.

---

## Context

웹 보안의 7대 통증(CORS 차단 → Preflight 폭풍 → XSS 무방비 → 화이트리스트 폭발 → JWT 위조 → 공격 표면 → 공급망/배포)을 NestJS BE + 기존 React/Vite FE 토글로 점진 시연한다. 학습자(백엔드 초보자)가 "왜 보안 헤더 한 줄이 필요한가"를 브라우저가 직접 차단·위반·통과하는 모습으로 깨닫는다. 각 챕터는 이전 챕터의 한계로 등장하며, `x-security-status` 응답 헤더가 모든 차이를 숫자/문자열로 가시화한다. 기존 OAS Lecture Suite의 `x-contract-status` 패턴과 동일한 진화 측정 모델을 따른다.

---

## 핵심 학습 목표

1. CORS는 서버가 허용해야 동작한다 — 브라우저는 막을 뿐, 정책 결정자는 서버다.
2. Preflight는 OPTIONS + `Max-Age` 캐시로 비용을 0에 수렴시킨다.
3. 인증쿠키는 명시적 origin + `Allow-Credentials` + `withCredentials` 3박자가 동시에 맞아야 한다.
4. CSP `default-src 'self'`만으로 인라인 XSS의 절반이 막힌다 — 그러나 도메인 화이트리스트는 폭발한다.
5. Strict CSP(Nonce + `strict-dynamic`)가 실무 기본값이다.
6. JWT는 알고리즘 강제·짧은 TTL·payload 정제 없이는 안전하지 않다.
7. 공격 표면 축소(rate limit + UUID + Helmet + `x-powered-by` 제거)는 0행 코드가 아닌 명시적 정책이다.
8. CI 보안 게이트(4-eyes 머지·dep-scan·롤백)가 있어야 사고가 사고로 끝난다.

---

## 대상 학습자

- NestJS 기본 DI/Module 알고 있음
- TypeScript 기본 가능
- REST API 작성 경험 있음
- 브라우저 DevTools(Network/Console) 활용 가능
- (선택) 기존 OAS Lecture Suite Ch01 학습 경험

---

## 기술 스택

| 패키지 | 버전 | 역할 | 챕터 |
|--------|------|------|------|
| NestJS | ^11.x | 기반 프레임워크 | 전 챕터 |
| `helmet` | ^8.x | CSP/보안 헤더 일괄 | Ch03~Ch06 |
| `@nestjs/throttler` | ^6.x | rate limiting | Ch06 |
| `@nestjs/jwt` | ^10.x | JWT 발급/검증 | Ch05~ |
| `bcrypt` | ^5.x | 비밀번호 해싱 | Ch05 |
| `uuid` | ^11.x | UUID v7 PublicId | Ch06 |
| React 18 + Vite 7 | (기존) | 검증용 FE | Ch01~Ch06 |
| `@faker-js/faker` | ^10.x | 결정론적 시드 | 전 챕터 |
| **삭제**: `@apollo/server`, `@nestjs/apollo`, `@nestjs/graphql`, `dataloader`, `graphql` | — | GraphQL 시리즈 잔재 | — |

---

## 도메인 모델

기존 OAS Suite 도메인 재활용 (`libs/mock-data/src/domain.ts`):

```typescript
export interface User {
  id: number;            // 내부 PK
  publicId: string;      // Ch06부터 — UUID v7, URL 노출용
  name: string;
  email: string;
  passwordHash: string;  // Ch05 추가 — bcrypt
  createdAt: string;     // ISO
}

export interface Product {
  id: number;
  name: string;
  priceInWon: number;
  createdAt: string;
}

export type OrderStatus = 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  items: OrderItem[];
}

export interface OrderItem {
  productId: number;
  quantity: number;
  unitPriceInWon: number;
}
```

**보안 시리즈가 추가하는 표면**:
- `POST /auth/login` (Ch05~) — JWT 발급
- `GET /users/me` (Ch05~) — 인증 필요
- `GET /orders` (Ch01~) — `withCredentials` 검증 대상

---

## 프로젝트 디렉토리 구조

```
db-with-nestjs/  (worktree: .worktrees/security/, branch: feat/security-lecture-suite)
├── apps/
│   ├── lecture/src/
│   │   ├── app.module.ts                            (챕터 토글)
│   │   ├── main.ts                                  (Helmet/CORS 챕터별 분기)
│   │   ├── common/
│   │   │   └── security-status.interceptor.ts       (신규)
│   │   ├── ch01-cors-block/
│   │   ├── ch02-preflight-storm/
│   │   ├── ch03-xss-open-door/
│   │   ├── ch04-allowlist-bloat/
│   │   ├── ch05-jwt-forge/
│   │   ├── ch06-attack-surface/
│   │   └── ch07-supply-chain-pain/
│   └── web/src/
│       ├── active-chapter.ts                        (보안 챕터 토글)
│       ├── lib/security-debug.tsx                   (x-security-status 시각화 배지)
│       ├── ch01-cors-block/AttemptCallPanel.tsx
│       ├── ch02-preflight-storm/PreflightProbe.tsx
│       ├── ch03-xss-open-door/InlineScriptPanel.tsx
│       ├── ch04-allowlist-bloat/StrictCspProbe.tsx
│       ├── ch05-jwt-forge/LoginForm.tsx
│       └── ch06-attack-surface/RateLimitProbe.tsx
│
├── libs/mock-data/src/
│   ├── domain.ts                                    (publicId/passwordHash 추가)
│   └── seed.ts                                      (faker.seed(42), bcrypt 시드)
│
└── .github/workflows/
    └── security-gate.yml                            (Ch07 — 4-eyes + dep-audit + rollback step)
```

---

## 공통 학습 보조 장치

### 측정 장치 — `x-security-status` 응답 헤더

`SecurityStatusInterceptor` (`apps/lecture/src/common/security-status.interceptor.ts`)가 매 응답에 챕터별 토큰 부착. 기존 `ContractStatusInterceptor`의 인터페이스 패턴을 그대로 차용:

| Ch | 헤더 예시 | 학습 활용 |
|----|-----------|----------|
| 01a | `cors=blocked` (Allow-Origin 부재) | 브라우저 콘솔에 차단 메시지 |
| 01b | `cors=allowed,origin=http://localhost:5173` | 정확한 origin 허용 |
| 02 | `preflight=fresh` → `preflight=cached(86400s)` | OPTIONS 5/5 → 1/5 |
| 02b | `credentials=allowed,origin=explicit` | wildcard 차단 검증 |
| 03 | `csp=report-only,violations=N` | 인라인 위반 카운트 |
| 04 | `csp=enforced,nonce=true,strict-dynamic=on,frame-ancestors=self` | 화이트리스트 0 |
| 05 | `jwt=alg-locked,exp=300s,verified` | alg=none 위조 시 401 |
| 06 | `ratelimit=5/60s,id=uuid,fingerprint=stripped` | brute/IDOR 차단 |
| 07 | `gate=approved,cve=0,rollback=ready` | CI 게이트 시그널 |

`main.ts` `enableCors`의 `exposedHeaders`에 `x-security-status` 추가.

### 결정론적 시드

`faker.seed(42)` — 모든 챕터 동일 데이터. 비밀번호 해싱은 학습용 약 cost(8) 사용해 시작 시간 단축.

### 챕터 토글

- **BE**: `app.module.ts`에서 `ChXXSecurityModule` 한 챕터만 import.
- **FE**: `active-chapter.ts` 단일 export(`'ch01' | 'ch02' | ...`) — 라우트 분기.

---

## 챕터 상세 설계

### Ch01: CORS 미설정 차단 (`ch01-cors-block/`)

**시나리오**: FE(`http://localhost:5173`)가 BE(`http://localhost:3000/products`)를 fetch한다. 서버가 `Access-Control-Allow-Origin`을 보내지 않아 브라우저가 응답을 차단한다. **응답은 200으로 도착했지만 페이지가 못 닿는다** — Network 탭에는 200, 콘솔에는 CORS 에러.

**학습 목표**: CORS는 서버 허락이지 브라우저 권한이 아님. SOP가 기본값.

**구현 포인트**:
- `main.ts`에서 `app.enableCors()` **의도적 미호출**
- `SecurityStatusInterceptor`: `cors=blocked` 토큰
- FE `AttemptCallPanel.tsx`: `fetch('http://localhost:3000/products')` → 콘솔 에러 + 응답 헤더 표시 시도(실패) 가시화
- **의도적 안티패턴**: 서버는 정상 응답하지만 CORS 헤더 부재

**시연**:
```bash
pnpm start:dev   # BE
pnpm start:web   # FE
# 브라우저 콘솔: "Access to fetch ... blocked by CORS policy"
curl -H "Origin: http://localhost:5173" -i http://localhost:3000/products  # curl은 정상
```

**Ch01b 토글**: `main.ts`에서 `app.enableCors({ origin: 'http://localhost:5173' })` 한 줄 추가 → 통과. 헤더 `cors=allowed,origin=http://localhost:5173`.

**주석 강조점**: "이 한 줄을 빼면 브라우저가 막는다 — 서버는 자기가 잘못한 줄 모른다."

---

### Ch02: Preflight 폭풍 + Credentialed 미스매치 (`ch02-preflight-storm/`)

**시나리오**: PUT/DELETE, 또는 `Authorization: Bearer ...` 커스텀 헤더가 붙은 요청은 매번 OPTIONS 라운드트립을 한다. 이어서 `withCredentials: true`로 쿠키를 보내려는데 서버가 `Allow-Credentials`를 안 보내거나 wildcard origin을 보내 차단된다.

**학습 목표**: simple vs preflight 분기 / `Max-Age` 캐시 / credentialed 3박자(`Allow-Credentials: true` + 명시적 origin + 클라이언트 `credentials: 'include'`).

**구현 포인트**:
- `app.enableCors({ origin: 'http://localhost:5173', credentials: true, maxAge: 86400, allowedHeaders: ['Content-Type', 'Authorization'] })`
- 시연 토글: `maxAge` 0 vs 86400, `origin: '*'` vs explicit
- FE `PreflightProbe.tsx`: 같은 `PUT /orders/:id`을 5번 연속 호출 → OPTIONS 횟수 카운트(Network 탭)
- `SecurityStatusInterceptor`: `preflight=fresh` → `preflight=cached(86400s)` / `credentials=allowed,origin=explicit`

**시연 비교**:

| 모드 | OPTIONS 횟수 | 학습 |
|------|-------------|------|
| Max-Age=0 | 5/5 | 매번 라운드트립 |
| Max-Age=86400 | 1/5 | 캐시 효과 |
| `origin: '*'` + credentials | 차단됨 | 명세 강제 |

**주석 강조점**: "wildcard origin과 credentials는 동시 사용 불가 — 표준 강제."

---

### Ch03: 인라인 스크립트로 XSS 무방비 (`ch03-xss-open-door/`)

**시나리오**: 상품 설명에 스크립트 태그가 포함된 사용자 입력을 서버측 검증/이스케이프 없이 DOM에 삽입한다. CSP가 없으니 실행됨. CSP-Report-Only 모드로 도입해 위반 갯수만 세고, Ch04에서 enforce로 전환한다.

**학습 목표**: `default-src 'self'` + `script-src 'self'`만으로 인라인 스크립트 차단 가능. Report-Only는 학습/롤아웃 단계용 도구.

**구현 포인트**:
- `helmet.contentSecurityPolicy({ reportOnly: true, directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] } })`
- FE `InlineScriptPanel.tsx`: 사용자 입력을 `textContent` 대신 raw HTML로 삽입하는 잘못된 패턴 시연 — React의 이스케이프 우회 API를 학습용 단일 컴포넌트에서 한 번만 사용, 주석으로 "production 절대 금지" 명시
- BE `POST /_csp/report` 엔드포인트(report-uri) — 위반 카운트 in-memory
- `SecurityStatusInterceptor`: `csp=report-only,violations=<count>`
- **의도적 안티패턴**: 서버측 입력 sanitize 누락 + 클라이언트측 raw HTML 삽입

**시연**: 스크립트 태그 입력 → 브라우저에서 실행됨 + CSP 콘솔에 violation 출력. 헤더 `csp=report-only,violations=1`.

**주석 강조점**: "Report-Only는 보호가 아니다 — 정책 검증용. raw HTML 삽입은 production 금지."

---

### Ch04: 화이트리스트 폭발 → Strict CSP (`ch04-allowlist-bloat/`)

**시나리오**: GA, Sentry, Stripe 등 3rd-party 스크립트마다 `script-src` 도메인 추가. 추가될 때마다 정책 폭발 + 배포. → Nonce + `strict-dynamic`로 전환하면 `script-src`에 도메인 0개, 신뢰 체인이 자동 전파.

**학습 목표**: Nonce vs Hash 차이 / `strict-dynamic` / `frame-ancestors`로 clickjacking 방지 (X-Frame-Options 대체).

**구현 포인트**:
- 요청마다 nonce 생성 미들웨어 (`crypto.randomBytes(16).toString('base64')`)
- `helmet.contentSecurityPolicy({ directives: { scriptSrc: ["'nonce-${nonce}'", "'strict-dynamic'"], frameAncestors: ["'self'"] } })`
- HTML index에 `<script nonce="${nonce}">` 인젝션 (Vite plugin 또는 NestJS에서 SSR-style 변환)
- 시연 토글: 화이트리스트 모드 vs strict 모드
- `csp=enforced,nonce=true,strict-dynamic=on,frame-ancestors=self`

**시연 비교**:

| 모드 | `script-src` 도메인 수 | 새 3rd-party 추가 비용 |
|------|----------------------|----------------------|
| Whitelist | 5+ (점점 증가) | 정책 수정 + 배포 |
| Strict (Nonce + strict-dynamic) | 0 | nonce 일치만 |

**주석 강조점**: "Strict CSP는 화이트리스트를 도메인이 아닌 신뢰 체인으로 바꾼다."

---

### Ch05: JWT 위조 (`ch05-jwt-forge/`)

**시나리오**: `POST /auth/login` → JWT 발급. 학습자는 jwt.io에서 헤더의 `alg`을 `none`으로 바꾸거나 secret을 brute force 시도. 서버가 알고리즘을 헤더에서 읽으면 위조 통과, 백엔드에서 `algorithms: ['HS256']` 강제하면 401.

**학습 목표**: `alg=none` 공격 / 256bit+ secret / TTL 5분 / payload 정제(이메일/role만, 비밀번호/PII 금지).

**구현 포인트**:
- `JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { algorithm: 'HS256', expiresIn: '5m' } })`
- 검증 시 `verify(token, secret, { algorithms: ['HS256'] })` 명시
- 시연 토글: 약한 secret(`"secret"`) vs 강 secret(`crypto.randomBytes(32).toString('base64')`)
- `JwtStrategy`(passport) + `JwtAuthGuard` 적용 — `/users/me`에 `@UseGuards(JwtAuthGuard)`
- 헤더 `jwt=alg-locked,exp=300s,verified`
- **의도적 안티패턴**: payload에 `password` 필드를 포함하는 잘못된 구현(주석 처리 + "이렇게 하면 안 된다" 주석)

**시연**:
```bash
# 1. 정상 로그인
curl -X POST localhost:3000/auth/login \
  -d '{"email":"u@x.com","password":"p"}' -H "Content-Type: application/json"
# → { "accessToken": "eyJ..." }
# 2. jwt.io에서 alg=none으로 변조 후 사용
curl -H "Authorization: Bearer <forged>" localhost:3000/users/me
# Ch04 모드: 200 (위조 통과 — 안티패턴)
# Ch05 모드: 401
```

**주석 강조점**: "secret과 알고리즘은 토큰이 아니라 코드에서 결정된다."

---

### Ch06: 공격 표면 축소 (`ch06-attack-surface/`)

**시나리오**: brute force 로그인 + IDOR(`/users/123` → `/users/124` 추측) + `x-powered-by`로 스택 노출 + MIME sniff. 4개 표면을 한 번에 닫는다.

**학습 목표**: rate limit + UUID v7 PublicId + Helmet 보안 헤더 일괄 + `x-powered-by` 제거.

**구현 포인트**:
- `@nestjs/throttler` `@Throttle({ default: { limit: 5, ttl: 60_000 } })` on `/auth/login`
- `User.publicId: string` (UUID v7) 컬럼 추가, URL은 `/users/:publicId`, 내부 PK는 `id` 유지
- `helmet()` 일괄 적용: `X-Content-Type-Options: nosniff`, `X-Frame-Options: deny`, `Referrer-Policy: no-referrer`
- `app.disable('x-powered-by')` 또는 `helmet.hidePoweredBy()`
- 헤더 `ratelimit=5/60s,id=uuid,fingerprint=stripped`

**시연**:
```bash
# 1. brute force (5+번 잘못된 로그인)
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/auth/login \
    -d '{"email":"u@x.com","password":"wrong"}' -H "Content-Type: application/json"
done
# 5개 401 + 5개 429

# 2. IDOR 시도
curl -i localhost:3000/users/1          # 404 (숫자 ID 거부)
curl -i localhost:3000/users/<uuid-v7>  # 타인 ID이면 403

# 3. 헤더 검사
curl -i localhost:3000/products | grep -iE 'x-powered|x-content-type|x-frame'
```

**측정 비교**:

| 항목 | Ch05 | Ch06 |
|------|------|------|
| brute force 차단률 | 0% | 50% (5+ throttled) |
| IDOR 추측 성공률 | 100% (순차 ID) | ~0 (UUID v7) |
| `x-powered-by` 노출 | 있음 | 제거 |

**주석 강조점**: "이 4개는 별개 통증이지만 한 번에 닫는다 — 공격 표면은 표면적이다."

---

### Ch07: 공급망 / 배포 결함 (`ch07-supply-chain-pain/`)

**시나리오**: PR 작성자가 self-approve 머지, `pnpm audit`이 high CVE를 보고하는데 무시, 배포 후 사고 발생 시 롤백 명령이 없음. 코드가 아닌 **파이프라인**이 보안의 마지막 줄.

**학습 목표**: 4-eyes(작성자 ≠ 승인자) + dep-scan gate + rollback 자동화.

**구현 포인트**:
- `.github/workflows/security-gate.yml`:
  1. PR open → `pnpm audit --audit-level=high` (CVE 검출 시 fail)
  2. PR review 1+ 필수 + CODEOWNERS로 작성자 승인 차단(브랜치 보호 규칙 안내)
  3. main merge → `pnpm build` + git tag
  4. rollback step: `scripts/rollback.mjs` (`git revert <merge-sha>` 시뮬레이션)
- 헤더 `gate=approved,cve=0,rollback=ready`

**시연**:
```bash
# 1. CVE 재현 (시연 전용 브랜치 — main에 직접 push 금지)
pnpm add lodash@4.17.20
gh pr create ...
# CI fail — audit이 prototype pollution CVE 검출

# 2. 패치
pnpm add lodash@latest
# CI 통과

# 3. 롤백 시뮬레이션
pnpm run rollback --to=v0.6.0
```

**주석 강조점**: "보안 사고는 코드가 아니라 프로세스에서 시작된다."

---

## 챕터 간 비교 가이드

| 챕터 | `x-security-status` | 핵심 차이 |
|---|---|---|
| 01a | `cors=blocked` | 서버가 허락 안 함 |
| 01b | `cors=allowed,origin=http://localhost:5173` | 한 줄 추가 |
| 02 | `preflight=cached(86400s),credentials=allowed,origin=explicit` | OPTIONS 5/5 → 1/5 |
| 03 | `csp=report-only,violations=1` | 위반만 기록 |
| 04 | `csp=enforced,nonce=true,strict-dynamic=on,frame-ancestors=self` | 화이트리스트 0 |
| 05 | `jwt=alg-locked,exp=300s,verified` | 위조 시도 → 401 |
| 06 | `ratelimit=5/60s,id=uuid,fingerprint=stripped` | brute/IDOR 차단 |
| 07 | `gate=approved,cve=0,rollback=ready` | CI 통과 시그널 |

---

## 시연 순서 (README 기반)

```bash
pnpm install

# BE: apps/lecture/src/app.module.ts에서 ChXXSecurityModule 토글
# FE: apps/web/src/active-chapter.ts에서 ACTIVE_CHAPTER 변경

pnpm start:dev   # BE :3000
pnpm start:web   # FE :5173

# 챕터별 시연(위 각 섹션의 시연 명령어 참조)
```

---

## 알려진 트레이드오프

- **`x-security-status`는 학습용 헤더**. prod에서 노출 시 공격자에게 정책 정보를 주는 격 → Ch06에서 명시적으로 제거 안내.
- **Ch07 CVE 시연**은 의도적으로 취약 버전 lock — 실수로 main merge 방지 위해 별도 시연 브랜치/`SECURITY_DEMO=1` 환경 변수로만 활성.
- **Ch05 인증**은 학습용 in-memory bcrypt — DB 없는 mock-data 위 동작. RDB는 OAS 시리즈와 별개.
- **`apps/web` 재사용**: 보안 시리즈 활성 시 기존 OAS 챕터 페이지는 비활성 (`active-chapter.ts` 분기).
