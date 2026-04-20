# DB with NestJS — 시나리오 기반 RDB 학습 프로젝트

TypeORM(PostgreSQL) + Prisma(MySQL) 두 가지 ORM을 이커머스 도메인으로 비교 학습합니다.

## 시작하기

```bash
docker compose up -d       # DB 시작
pnpm install               # 의존성 설치
pnpm prisma generate       # Prisma 클라이언트 생성
pnpm prisma db push        # MySQL 스키마 반영
pnpm start:dev             # 앱 실행 (http://localhost:3000)
```

## 시드 데이터

```bash
pnpm seed:basic            # 소량 데이터 (Ch01~02)
pnpm seed:bulk             # 대량 데이터 (Ch03~06 성능 체감)
```

## 챕터 구성

| # | 시나리오 | 핵심 학습 | 엔드포인트 접두사 |
|---|---------|----------|----------------|
| 1 | 쇼핑몰 오픈 | DB 연결, 엔티티, PK | /ch01 |
| 2 | 카탈로그 구축 | 관계, CRUD, QB, 뷰 | /ch02 |
| 3 | 주문 폭주 | N+1 문제 & 해결 | /ch03 |
| 4 | 블랙프라이데이 | 인덱스, EXPLAIN, 캐싱 | /ch04 |
| 5 | 시스템 리뉴얼 | 마이그레이션 전략 | /ch05 |
| 6 | 매출 분석 | 집계, 트랜잭션, 락, JSONB | /ch06 |

각 챕터의 TypeORM 버전은 `/chXX/typeorm/...`, Prisma 버전은 `/chXX/prisma/...` 경로입니다.
