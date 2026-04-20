// ============================================================
// Ch04PrismaService — 인덱스 & 쿼리 최적화 (MySQL)
// ============================================================
// MySQL과 PostgreSQL의 인덱스 차이:
//   - MySQL EXPLAIN: 실행 계획 (PostgreSQL의 EXPLAIN ANALYZE에 대응)
//   - MySQL FULLTEXT: MATCH ... AGAINST 구문 (PG의 tsvector에 대응)
//   - MySQL의 InnoDB 엔진은 기본적으로 PK에 Clustered Index 생성
//
// Prisma에서 인덱스:
//   schema.prisma에서 @@index([price])로 선언합니다
//   Prisma가 자동으로 CREATE INDEX SQL을 생성합니다
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class Ch04PrismaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // 가격 범위 검색 — @@index([price]) 인덱스 활용
  async searchByPriceRange(minPrice: number, maxPrice: number) {
    const start = Date.now();
    const products = await this.prisma.product.findMany({
      where: { price: { gte: minPrice, lte: maxPrice } },
      orderBy: { price: 'asc' },
      take: 20,
    });
    return { _meta: { elapsedMs: Date.now() - start }, data: products };
  }

  // MySQL EXPLAIN — 실행 계획 확인
  // type=range → 인덱스 범위 스캔 (빠름)
  // type=ALL → 전체 테이블 스캔 (느림)
  async explainPriceSearch(minPrice: number, maxPrice: number) {
    const result = await this.prisma.$queryRaw`
      EXPLAIN SELECT * FROM Product WHERE price BETWEEN ${minPrice} AND ${maxPrice} ORDER BY price LIMIT 20
    `;
    return { note: 'type=range → 인덱스 범위 스캔. type=ALL → 전체 스캔.', plan: result };
  }

  // 커서 기반 페이지네이션 (Prisma 네이티브 지원)
  // Prisma는 cursor 옵션을 기본 제공하므로 별도 쿼리 빌더가 필요 없습니다
  async findProductsByCursor(cursor: number | undefined, limit: number) {
    const products = await this.prisma.product.findMany({
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
    const nextCursor = products.length > 0 ? products[products.length - 1].id : null;
    return { data: products, nextCursor };
  }

  // MySQL FULLTEXT 검색 — MATCH ... AGAINST 구문
  // @@fulltext([name]) 인덱스가 schema.prisma에 선언되어 있어야 합니다
  async fulltextSearch(query: string) {
    return this.prisma.$queryRaw`
      SELECT id, name, price
      FROM Product
      WHERE MATCH(name) AGAINST(${query} IN BOOLEAN MODE)
      LIMIT 20
    `;
  }

  // 캐싱 — 동일한 쿼리 결과를 메모리에 60초 동안 저장
  async findProductsCached() {
    const cacheKey = 'ch04:prisma:products:top20';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return { _meta: { source: 'cache' }, data: cached };

    const products = await this.prisma.product.findMany({
      orderBy: { price: 'desc' },
      take: 20,
    });
    await this.cacheManager.set(cacheKey, products, 60000);
    return { _meta: { source: 'database' }, data: products };
  }
}
