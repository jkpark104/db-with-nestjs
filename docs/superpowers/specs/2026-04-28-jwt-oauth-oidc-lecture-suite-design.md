# JWT / OAuth 2.0 / OIDC Lecture Suite — 시나리오 학습 설계서

> **For agentic workers:** 이 spec을 기반으로 `superpowers:writing-plans` 스킬로 구현 플랜을 작성하세요.

---

## Context

`db-with-nestjs` 레포의 네 번째 학습 분기. `feat/db-lecture-suite` → `feat/graphql-lecture-suite` → `feat/oas-lecture-suite`에 이어, **JWT / OAuth 2.0 / OIDC 학습 브랜치**(`feat/jwt-oauth-oidc-lecture-suite`)를 분기한다.

이전 suite들은 단일 프로세스 토글 패턴(`app.module.ts`에서 챕터 하나만 활성화)으로 운영되었다. 본 suite는 **OAuth가 본질적으로 다중 프로세스(Auth Server + Resource Server + Client)** 를 전제하는 도메인이므로, 기존 토글 패턴을 적용하지 않는다. 대신 Auth Server가 챕터마다 점진적으로 진화하고, 챕터별 Client app이 추가되는 조직 전략을 쓴다.

학습 narrative는 **"우리 쇼핑몰이 OAuth Provider 역할을 맡으면서 외부 통합 요구를 받는 과정"** 으로 진행된다. JWT 자체의 통증(세션 vs 토큰 등)은 다루지 않는다. JWT는 권장 구현(짧은 access TTL · 클라이언트 메모리, refresh 긴 TTL · Redis-mock + rotation, RS256 · JWKS)으로 인프라화하고, 학습자는 OAuth/OIDC 통증을 시나리오로 직접 굴린다.

학습을 마치면 다음을 직접 코드로 체험한다:
1. 왜 OAuth가 비번 공유를 대체하는지
2. 어떤 grant_type이 어느 client 컨텍스트에 적합한지
3. PKCE의 보안적 가치 (code 탈취 방어)
4. OAuth(권한) ↔ OIDC(신원)의 분리
5. 실무 OAuth Provider의 점진적 진화 경로

**이전 분기 참조**:
- RDB: `feat/db-lecture-suite` / `docs/superpowers/specs/2026-04-20-db-lecture-suite-design.md`
- GraphQL: `feat/graphql-lecture-suite` / `docs/superpowers/specs/2026-04-26-graphql-lecture-suite-design.md`
- OAS: `feat/oas-lecture-suite` / `docs/superpowers/specs/2026-04-27-oas-lecture-suite-design.md`

---

## 핵심 학습 목표

1. **비번 공유의 구조적 한계를 코드로 체감한다** — 서드파티 앱이 사용자 비번을 평문 보관하고 매번 재사용하는 순간, 권한 위임 불가·범위 통제 불가가 추상 개념이 아닌 실제 위험임을 깨닫는다.
2. **OAuth 2.0 Authorization Code Flow의 5단계가 비번 노출 없이 위임을 가능하게 한다** — `state` 검증·code 교환·refresh rotation까지 직접 구현하면서 표준이 존재하는 이유를 이해한다.
3. **client_secret을 보관할 수 없는 환경에서는 PKCE가 code 탈취를 방어한다** — code_verifier/code_challenge 쌍이 authorization code를 가로챈 공격자를 무력화하는 원리를 코드로 확인한다.
4. **사용자 개입 없는 M2M 통합은 별도 grant가 필요하다** — Client Credentials를 구현하면서 "사용자 sub 없는 토큰"이 존재하는 이유와 적합한 사용처를 파악한다.
5. **access token은 권한 증명이지 신원 증명이 아니다** — OIDC ID Token을 도입하는 순간 "누구를 위한 토큰인가"와 "이 사람이 누구인가"가 다른 질문임을 깨닫는다.
6. **OIDC 풀 흐름 — ID Token + UserInfo로 외부 서비스가 우리 사용자 신원을 안전히 받아 SSO를 구축한다** — 'Login with our-shop' 시나리오로 소셜 로그인의 전 흐름을 직접 작성한다.

---

## 대상 학습자

**전제 지식**:
- NestJS 기본 (Module / Controller / Provider / Guard / Interceptor)
- TypeScript 기본 (인터페이스, 제네릭)
- REST API 개념 (HTTP 메서드, 상태 코드, 헤더, JSON)

**권장 선행**: `feat/db-lecture-suite` 또는 동등한 NestJS REST API 작성 경험.

**JWT 사전 지식 불필요** — 본 suite에서 JWT 권장 구현을 공통 인프라로 제공하므로 처음 접하는 학습자도 진행 가능.

---

## 기술 스택

| 패키지 | 역할 | 챕터 |
|--------|------|------|
| `@nestjs/core`, `@nestjs/common` | NestJS 프레임워크 | 전 챕터 |
| `jose` | JWT 발급·검증, RS256 키페어, JWKS | Ch02~ |
| `node:crypto` | PKCE code_challenge (SHA-256) | Ch03 |
| `ioredis-mock` | Refresh Token 인메모리 저장소 (Redis API 호환) | Ch02~ |
| `@faker-js/faker` | 결정론적 시드 (faker.seed(42)) | 전 챕터 |
| `concurrently` | 챕터별 다중 프로세스 동시 실행 | 전 챕터 |
| **삭제 없음** | — 기존 OAS suite 의존성 유지, 새 앱만 추가 | — |

> **⚠️ jose vs @nestjs/jwt**: `jose`는 JWKS endpoint 지원 및 Web Crypto API 표준 준수가 학습 가치가 높아 선택. `@nestjs/jwt`는 JWKS 직접 지원 없어 Resource Server의 토큰 검증 구현이 비표준화됨.

> **⚠️ ioredis-mock 버전 확인**: writing-plans 단계에서 npm 레지스트리 확인 후 버전 확정. 대안: 단순 `Map<string, RefreshToken>` + `setTimeout` TTL 모사.

---

## 도메인 모델

```typescript
// libs/mock-data/src/domain.ts — 기존 모델 확장 (OAS suite와 공유)

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;   // Ch01 anti-pattern 시연용
}

export interface Product {
  id: number;
  name: string;
  priceInWon: number;     // Contract Invariant 유지
}

export type OrderStatus = 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  userId: number;
  productId: number;
  status: OrderStatus;
  createdAt: string;      // ISO 8601
}

// --- OAuth-specific (신규 추가) ---

export interface RegisteredClient {
  clientId: string;
  clientSecret?: string;          // PKCE 전용 client는 undefined
  redirectUris: string[];
  allowedGrantTypes: Array<'authorization_code' | 'client_credentials'>;
  allowedScopes: string[];
  pkceRequired: boolean;
}

export interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: number;
  scope: string;
  redirectUri: string;
  expiresAt: number;
  codeChallenge?: string;         // PKCE (Ch03+)
  codeChallengeMethod?: 'S256';   // PKCE (Ch03+)
  nonce?: string;                 // OIDC (Ch05+)
}

export interface RefreshToken {
  jti: string;
  clientId: string;
  userId?: number;        // Client Credentials면 undefined
  scope: string;
  hashedToken: string;    // sha256 해시 — DB엔 원본 저장 안 함
  expiresAt: number;
}
```

---

## 프로젝트 디렉토리 구조

```
db-with-nestjs/  (feat/jwt-oauth-oidc-lecture-suite)
│
├── apps/
│   │
│   ├── ch01-password-sharing/          # 통증: 비번 공유 raw 통합
│   │   ├── our-service/                # NestJS — 자체 username/password 인증 (포트 3001)
│   │   │   └── src/
│   │   │       ├── main.ts
│   │   │       ├── app.module.ts
│   │   │       ├── auth/               # POST /login, GET /api/orders (세션 쿠키)
│   │   │       └── orders/             # GET /api/orders
│   │   └── third-party-app/            # NestJS — 비번 받아 raw 통합 (포트 3011)
│   │       └── src/
│   │           ├── main.ts
│   │           └── integrate/          # POST /integrate (💀 비번 보관 + raw 로그인)
│   │
│   ├── auth-server/                    # Ch02 등장, 챕터마다 진화 (포트 4000)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── grants/
│   │       │   ├── authorization-code.service.ts   # Ch02
│   │       │   ├── pkce.service.ts                  # Ch03 추가
│   │       │   ├── client-credentials.service.ts   # Ch04 추가
│   │       │   └── openid.service.ts                # Ch05 추가 (ID Token)
│   │       ├── authorize/              # GET  /authorize (동의 화면)
│   │       ├── token/                  # POST /token (code → access + refresh)
│   │       ├── jwks/                   # GET  /.well-known/jwks.json
│   │       ├── refresh-store/          # RefreshToken CRUD (ioredis-mock or Map)
│   │       └── userinfo/               # GET  /userinfo (Ch06 추가)
│   │
│   ├── resource-server/                # Ch02 등장 — JWT 검증·scope 검사만 (포트 5000)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── common/
│   │       │   ├── jwt-verifier.service.ts          # JWKS 조회 + public key 캐싱
│   │       │   ├── scope.guard.ts                   # scope 검사
│   │       │   └── x-auth-power.interceptor.ts      # 측정 헤더 주입
│   │       ├── orders/                 # GET /api/orders (scope=orders:read)
│   │       ├── products/               # GET /api/products
│   │       ├── stats/                  # GET /api/stats  (scope=stats:read, Ch04+)
│   │       └── user-profile/           # GET /api/user/profile (OIDC, Ch05+)
│   │
│   ├── ch02-client-server-side/        # 전통 server-side web app (포트 3002)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── login.controller.ts     # GET /login → auth-server redirect
│   │       ├── callback.controller.ts  # GET /callback — code 수신 + state 검증
│   │       └── oauth.service.ts        # code → token 교환 + refresh 관리
│   │
│   ├── ch03-client-spa/                # PKCE (포트 3003)
│   │   └── src/
│   │       ├── main.ts                 # NestJS static asset serving
│   │       └── public/
│   │           └── index.html          # vanilla JS — verifier/challenge 생성 + PKCE 흐름
│   │
│   ├── ch04-client-m2m/                # Client Credentials (콘솔 1회 실행)
│   │   └── src/
│   │       └── main.ts                 # 실행 시 token 발급 → /api/stats 호출 → 종료
│   │
│   ├── ch05-client-oidc/               # OIDC ID Token (포트 3005)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── login.controller.ts     # scope=openid+orders:read 포함
│   │       ├── callback.controller.ts  # ID Token 수신 + 서명 검증 + nonce 확인
│   │       └── oidc.service.ts         # ID Token decode + claims 출력
│   │
│   └── ch06-client-social-login/       # UserInfo + SSO (포트 3006)
│       └── src/
│           ├── main.ts
│           ├── login.controller.ts
│           ├── callback.controller.ts  # ID Token 검증 → UserInfo 호출 → 자체 세션 발급
│           └── social-auth.service.ts  # 사용자 자동 생성/연결 로직
│
├── libs/
│   └── mock-data/                      # faker.seed(42) — 전 챕터 공유
│       └── src/
│           ├── index.ts
│           ├── domain.ts               # 위 TypeScript 인터페이스
│           ├── seed.ts                 # faker.seed(42) — 결정론적
│           ├── store.ts                # 인메모리 배열 (users, products, orders, clients)
│           └── mock-repository.ts     # findOne / findMany
│
├── nest-cli.json                       # 모노레포 — 8개+ 앱 등록
├── package.json
└── tsconfig.json
```

### 포트 할당

| 서비스 | Port | 등장 챕터 |
|--------|------|---------|
| auth-server | 4000 | Ch02~ |
| resource-server | 5000 | Ch02~ |
| ch01 our-service | 3001 | Ch01 |
| ch01 third-party-app | 3011 | Ch01 |
| ch02-client-server-side | 3002 | Ch02 |
| ch03-client-spa | 3003 | Ch03 |
| ch04-client-m2m | 없음 (콘솔) | Ch04 |
| ch05-client-oidc | 3005 | Ch05 |
| ch06-client-social-login | 3006 | Ch06 |

---

## 공통 학습 보조 장치

### 측정 장치: `x-auth-power` 응답 헤더

Resource Server (`apps/resource-server/src/common/x-auth-power.interceptor.ts`)에 NestJS Interceptor로 주입. AsyncLocalStorage 기반 카운터 (기존 `libs/mock-data/call-counter.ts` 패턴 응용).

**출력 형식**:
```
x-auth-power: password_exposures=N, scope=A+B, ttl=Ns, grant=<type>, refresh=N, id_token=<present|absent>, pkce=<true|false>, userinfo_called=N
```

**챕터별 기대값**:

| Ch | 기대 헤더 | 의미 |
|----|----------|------|
| 01 | `password_exposures=1, scope=ALL, ttl=∞, grant=password` | 비번 1회 노출, 전체 권한, 만료 없음 |
| 02 | `password_exposures=0, scope=orders:read, ttl=300, grant=code, refresh=0` | 비번 0, 최소 권한, 300s TTL |
| 03 | `password_exposures=0, scope=orders:read, ttl=300, grant=code+pkce` | PKCE 추가 |
| 04 | `password_exposures=0, scope=stats:read, ttl=300, grant=client_credentials, sub=client:billing-batch` | 사용자 sub 없음 |
| 05 | `password_exposures=0, scope=openid+orders:read, ttl=300, id_token=present` | ID Token 첫 등장 |
| 06 | `password_exposures=0, scope=openid+profile, id_token=present, userinfo_called=1` | UserInfo 호출 완료 |

### 결정론적 시드

`faker.seed(42)` — `libs/mock-data/src/seed.ts`. 챕터 변경 시 데이터 변동으로 인한 혼란 방지.

### 챕터 토글 (다중 프로세스)

본 suite는 단일 프로세스 `app.module.ts` 토글 패턴을 쓰지 않는다. `package.json`의 `start:chXX` 스크립트로 챕터별 필요 프로세스를 `concurrently`로 실행:

```json
"start:ch01": "concurrently \"nest start ch01-our-service --watch\" \"nest start ch01-third-party-app --watch\"",
"start:ch02": "concurrently \"nest start auth-server --watch\" \"nest start resource-server --watch\" \"nest start ch02-client-server-side --watch\"",
"start:ch03": "concurrently \"nest start auth-server --watch\" \"nest start resource-server --watch\" \"nest start ch03-client-spa --watch\"",
"start:ch04": "concurrently \"nest start auth-server --watch\" \"nest start resource-server --watch\" \"ts-node apps/ch04-client-m2m/src/main.ts\"",
"start:ch05": "concurrently \"nest start auth-server --watch\" \"nest start resource-server --watch\" \"nest start ch05-client-oidc --watch\"",
"start:ch06": "concurrently \"nest start auth-server --watch\" \"nest start resource-server --watch\" \"nest start ch06-client-social-login --watch\""
```

---

## 챕터 상세 설계

### Ch01: 비번 공유 통합의 한계 (`apps/ch01-password-sharing/`)

**시나리오**: 가격비교 사이트가 우리 쇼핑몰 사용자의 주문 이력을 읽어 가격 분석을 제공하려고 한다. 가장 단순한 방법: 사용자가 외부 사이트에 우리 쇼핑몰 비번을 입력하면, 외부 사이트가 우리 API에 매번 직접 로그인한다.

**학습 목표**: "비번 공유는 ① 권한 위임 불가, ② 권한 범위 통제 불가, ③ 비번 변경 시 모든 외부 앱 깨짐, ④ 외부 앱 신뢰에 의존"

**구현 포인트**:
- `our-service`: `POST /login {email, password}` → 세션 쿠키 발급, `GET /api/orders` (쿠키 필요). **Ch01 전용 `x-auth-power` interceptor 포함** — `password_exposures=1, scope=ALL, ttl=∞, grant=password` 반환. (resource-server는 Ch02에 등장; Ch01 측정은 our-service에서 직접 주입)
- `third-party-app`: `POST /integrate {email, password}` → **사용자 비번을 내부 변수에 보관** → our-service에 로그인 → our-service의 `x-auth-power` 헤더를 응답 body에 포함해 반환
- **의도적 안티패턴 주석**:
  ```typescript
  // 💀 ANTI-PATTERN: 사용자 비번이 외부 앱 메모리에 평문 보관됨
  // 💀 ANTI-PATTERN: 권한 범위 통제 불가 — 비번 하나로 모든 API 접근 가능
  // 💀 ANTI-PATTERN: 비번 변경 시 이 통합은 즉시 깨짐
  ```

**시연**:
```bash
pnpm start:ch01
curl -X POST localhost:3011/integrate \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@shop.com","password":"alice123"}'
# Response body에 auth_power 포함:
# { "orders": [...], "auth_power": "password_exposures=1, scope=ALL, ttl=∞, grant=password" }
```

---

### Ch02: Authorization Code Flow (`apps/ch02-client-server-side/` + `apps/auth-server/` 등장 + `apps/resource-server/` 등장)

**시나리오**: 가격비교 사이트가 server-side web app이다. client_secret을 안전하게 서버에 보관할 수 있다. Auth Server를 도입해 우리 쇼핑몰을 OAuth Provider로 만들고, 비번 공유 없이 주문 데이터를 위임한다.

**학습 목표**: "OAuth Authorization Code 5단계가 비번 노출 없이 위임을 가능하게 하는 메커니즘"

**구현 포인트 (auth-server)**:
- RS256 키페어 생성 + `/.well-known/jwks.json` (kid 포함)
- `GET /authorize`: 동의 화면 → authorization code 생성 (10분 TTL)
- `POST /token`: code + client_secret 검증 → access token (5분 TTL, RS256) + refresh token (7일 TTL, rotation)
- Refresh Token: ioredis-mock에 hashed 저장 (rotation: 사용 즉시 폐기 + 재발급)

**구현 포인트 (resource-server)**:
- JWKS 조회 (auth-server에서 public key 가져오기, 5분 캐싱)
- JWT 검증: signature, alg(RS256 whitelist), exp, nbf, iss, aud
- `scope` 클레임 검사 (ScopeGuard)
- `x-auth-power` interceptor 주입

**구현 포인트 (client)**:
- `state` UUID 생성 + 세션 저장 → auth-server로 리다이렉트
- `GET /callback`: state 검증 + code → token 교환 + refresh 쿠키 저장

**시연**:
```bash
pnpm start:ch02
# 브라우저: localhost:3002/login
# → auth-server 동의 화면 → 승인 → code 콜백 → token 교환
AT=$(cat /tmp/access_token)  # 콜백에서 출력
curl -i localhost:5000/api/orders -H "Authorization: Bearer $AT"
# x-auth-power: password_exposures=0, scope=orders:read, ttl=300, grant=code, refresh=0
```

---

### Ch03: PKCE (`apps/ch03-client-spa/`)

**시나리오**: 모바일 앱이나 SPA는 client_secret을 안전하게 보관할 수 없다. code를 가로챈 공격자가 token을 요청할 수 없도록 PKCE 확장을 추가한다.

**학습 목표**: "client_secret 없이도 PKCE의 verifier/challenge 쌍이 code 탈취 공격을 무력화하는 원리"

**구현 포인트 (auth-server 진화)**:
- `authorization_code` grant에서 `code_challenge` + `code_challenge_method=S256` 수신 → 코드와 함께 저장
- `/token`에서 `code_verifier` 수신 → `SHA-256(verifier) === code_challenge` 검증 (client_secret 불필요)

**구현 포인트 (ch03-client-spa)**:
- NestJS `@ServeStaticModule`로 `public/index.html` serving
- `index.html` vanilla JS:
  ```javascript
  // 1. code_verifier: crypto.getRandomValues → base64url
  // 2. code_challenge: SubtleCrypto.digest('SHA-256', verifier) → base64url
  // 3. sessionStorage에 verifier 저장
  // 4. /authorize?code_challenge=...&code_challenge_method=S256 리다이렉트
  // 5. 콜백 시 verifier 꺼내서 /token에 전송 (client_secret 없음)
  ```

**시연**:
```bash
pnpm start:ch03
# 브라우저: localhost:3003
# DevTools > Application > sessionStorage → code_verifier 확인
# DevTools > Network → /token 요청에 code_verifier 있고 client_secret 없음 확인
# x-auth-power: grant=code+pkce
```

---

### Ch04: Client Credentials — M2M (`apps/ch04-client-m2m/`)

**시나리오**: 백오피스 정산 배치가 매일 새벽 주문 통계를 집계해 분석 시스템에 보낸다. 사용자가 없으므로 Authorization Code 흐름이 부적합하다.

**학습 목표**: "M2M 통합은 사용자 동의 흐름 없이 client_id/secret만으로 token을 받는 별도 grant"

**구현 포인트 (auth-server 진화)**:
- `grant_type=client_credentials` 처리: client_id + client_secret 검증 → access token 발급
- token payload: `sub=client:<clientId>` (userId 없음), `scope=stats:read`
- refresh token 미발급 (M2M은 만료 시 재발급)

**구현 포인트 (resource-server 진화)**:
- `GET /api/stats` 엔드포인트 추가 (scope=stats:read)
- `sub=client:*` 형태의 token 처리 (사용자 컨텍스트 없음)

**구현 포인트 (ch04-client-m2m)**:
- NestJS `NestFactory.createApplicationContext()` (HTTP 서버 없이 실행)
- 시작 시 `/token` 호출 → access token 받기 → `/api/stats` 호출 → 결과 콘솔 출력 → 종료

**시연**:
```bash
pnpm start:ch04
# 콘솔: [ch04:m2m] Fetching token...
# 콘솔: [ch04:m2m] x-auth-power: grant=client_credentials, sub=client:billing-batch, scope=stats:read
# 콘솔: [ch04:m2m] Stats: { totalOrders: 42, ... }
# 프로세스 종료
```

---

### Ch05: OIDC ID Token (`apps/ch05-client-oidc/`)

**시나리오**: 가계부 앱이 'Login with our-shop'을 구현하려고 한다. access token을 받아도 "이 사용자가 누구인지" 알 수 없다. OAuth는 권한 증명, OIDC는 신원 증명.

**학습 목표**: "OAuth access token ≠ 사용자 신원. OIDC ID Token이 신원 정보를 표준화하는 방식"

**구현 포인트 (auth-server 진화)**:
- `scope=openid` 포함 시 ID Token 발급 (별도 JWT, 서명 = RS256)
- ID Token claims: `iss`, `sub`, `aud`, `exp`, `iat`, `nonce`, `name`, `email`
- nonce: `/authorize` 요청 시 client가 보낸 값을 그대로 ID Token에 포함

**구현 포인트 (ch05-client-oidc)**:
- `/authorize`에 `scope=openid+orders:read`, `nonce` 추가
- 콜백에서 `id_token` 수신 → JWKS로 서명 검증 → nonce 검증
- 콘솔에 `sub`, `email`, `name` 출력

**시연**:
```bash
pnpm start:ch05
# 브라우저: localhost:3005/login
# 콜백 후 콘솔: ID Token decoded: { sub: '1', email: 'alice@shop.com', name: 'Alice' }
# x-auth-power: scope=openid+orders:read, ttl=300, id_token=present
```

---

### Ch06: UserInfo + SSO 통합 (`apps/ch06-client-social-login/`)

**시나리오**: ID Token에는 핵심 식별 정보만 담긴다. 추가 프로필(주소, 전화)은 UserInfo 엔드포인트로. 외부 서비스가 우리 사용자 신원을 받아 자체 사용자를 자동 생성/연결하는 SSO 완성.

**학습 목표**: "OIDC 풀 흐름 — ID Token 검증 → UserInfo 호출 → 자체 사용자 생성/연결 → SSO 세션 발급"

**구현 포인트 (auth-server 진화)**:
- `GET /userinfo` (Bearer token 필요, `openid` scope 필수)
- 응답: `{ sub, name, email, phone, address }` (scope에 따라 필드 제한)

**구현 포인트 (ch06-client-social-login)**:
- ID Token 검증 → `sub` 추출
- `/userinfo` 호출 (access token으로)
- `sub`로 자체 DB 조회 → 없으면 자동 생성, 있으면 연결
- 자체 세션 쿠키 발급: `express-session` + 인메모리 스토어 (학습용). 우리 쇼핑몰 OAuth 계정과는 별개의 client 내부 세션.

**시연**:
```bash
pnpm start:ch06
# 브라우저: localhost:3006 → 'Login with our-shop' 버튼 클릭
# 브라우저: 동의 후 콜백 → UserInfo 호출 → 자동 회원가입 → "Welcome, Alice!"
# x-auth-power: scope=openid+profile, id_token=present, userinfo_called=1
```

---

## 챕터 간 비교 가이드

| Ch | password_exposures | scope | ttl | grant | id_token | 통증 → 해결 |
|----|-------------------|-------|-----|-------|----------|------------|
| 01 | **1** ⚠️ | ALL ⚠️ | ∞ ⚠️ | password ⚠️ | absent | (anti-pattern 체험) |
| 02 | 0 ✅ | orders:read | 300s | code | absent | 비번 공유 → OAuth 위임 |
| 03 | 0 | orders:read | 300s | code+pkce | absent | secret 노출 → PKCE |
| 04 | 0 | stats:read | 300s | client_credentials | absent | 사용자 흐름 부적합 → M2M |
| 05 | 0 | openid+orders:read | 300s | code | **present** ✅ | 권한 ≠ 신원 → ID Token |
| 06 | 0 | openid+profile | 300s | code | present + userinfo | ID Token 부족 → UserInfo + SSO |

---

## 시연 순서 (README 기반)

```bash
# 1. 설치
pnpm install

# 2. 챕터 선택 후 실행
pnpm start:ch01   # anti-pattern 체험
pnpm start:ch02   # Authorization Code Flow
pnpm start:ch03   # PKCE
pnpm start:ch04   # Client Credentials (M2M, 콘솔 실행 후 종료)
pnpm start:ch05   # OIDC ID Token
pnpm start:ch06   # UserInfo + SSO

# 3. 각 챕터 시연 — curl 또는 브라우저
curl -i localhost:5000/api/orders -H "Authorization: Bearer $AT"
# Response header: x-auth-power: <챕터별 기대값>
```

---

## Auth Server 진화 요약 (보안 구현 체크리스트 기반)

강의 노트의 "토큰 검증 필수 체크리스트"를 auth-server 구현에 반영:

| 항목 | 구현 위치 | 챕터 |
|-----|---------|------|
| 서명 알고리즘 화이트리스트 (RS256만 허용) | resource-server jwt-verifier | Ch02~ |
| iss 검증 (`http://localhost:4000`) | resource-server jwt-verifier | Ch02~ |
| aud 검증 (client_id) | resource-server jwt-verifier | Ch02~ |
| exp / nbf / iat 검증 | resource-server jwt-verifier | Ch02~ |
| JWKS kid 기반 public key 선택 | resource-server jwt-verifier | Ch02~ |
| Refresh Token hashed 저장 | auth-server refresh-store | Ch02~ |
| Refresh Token rotation (폐기 + 재발급) | auth-server token controller | Ch02~ |
| state 파라미터 CSRF 방어 | ch02~ch06 client callback | Ch02~ |
| redirect_uri 문자 단위 검증 | auth-server authorize | Ch02~ |
| nonce replay 방어 | auth-server token (openid) | Ch05~ |
| PKCE code_challenge 검증 (S256) | auth-server grants/pkce | Ch03~ |

---

## 위험 요소 + writing-plans 단계 검증 항목

1. **`jose` API 선택**: `jose`의 `generateKeyPair`, `SignJWT`, `jwtVerify`, `createLocalJWKSet`, `createRemoteJWKSet` API 정확한 사용법 — writing-plans에서 `context7` 또는 공식 문서 확인.
2. **ioredis-mock 패키지명/버전**: `ioredis-mock`으로 npm 검색 후 최신 안정 버전 확인. 대안: 단순 `Map` + `setTimeout` TTL.
3. **nest-cli.json 앱 등록**: `ch01-our-service`, `ch01-third-party-app` 등 중첩 폴더 구조 앱 등록 방식 — entryFile 경로 정확성 필요.
4. **concurrently 색상 구분**: 8개 프로세스가 동시 실행 시 로그 구분 — `--prefix-colors` 설정.
5. **Ch03 Web Crypto API**: NestJS 실행 환경(Node.js)에서 `SubtleCrypto` 사용 가능 여부 확인. 대안: `node:crypto` `createHash('sha256')`.

---

## Verification (구현 완료 시 확인 항목)

- [ ] `pnpm install` exit code 0
- [ ] `pnpm start:ch01` → `curl localhost:3011/integrate ...` → `x-auth-power: password_exposures=1, scope=ALL` 확인
- [ ] `pnpm start:ch02` → 브라우저 OAuth 흐름 완주 → `x-auth-power: password_exposures=0, scope=orders:read` 확인
- [ ] `pnpm start:ch03` → DevTools에서 `code_verifier` sessionStorage 확인, `/token`에 `client_secret` 없음 확인
- [ ] `pnpm start:ch04` → 콘솔에 `grant=client_credentials, sub=client:billing-batch` 출력 후 프로세스 종료
- [ ] `pnpm start:ch05` → ID Token 서명 검증 통과 + `sub`, `email` 콘솔 출력
- [ ] `pnpm start:ch06` → UserInfo 호출 성공 + `userinfo_called=1` 확인
- [ ] 모든 챕터에서 `password_exposures=0` (Ch01 제외)
- [ ] JWKS public key 캐싱 확인 (auth-server 재시작 없이 resource-server가 키 재사용)
- [ ] Refresh Token rotation: 동일 refresh token 2회 사용 시 2번째는 401
