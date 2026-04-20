// ============================================================
// Ch04TypeormService — 인덱스 & 쿼리 최적화 (PostgreSQL)
// ============================================================
//
// 인덱스(Index)란?
//   DB 테이블의 "색인" — 책 뒤의 색인처럼 원하는 데이터를 빠르게 찾는 자료구조
//   대부분 B-Tree 구조: 정렬된 트리로 O(log N) 시간에 검색
//
//   인덱스 없이 검색 = 전체 테이블 스캔 (Seq Scan) — 모든 행을 하나씩 확인
//   인덱스 있으면    = 인덱스 스캔 (Index Scan) — 트리 탐색으로 바로 찾음
//
// 인덱스의 트레이드오프:
//   - 읽기(SELECT) 속도 향상
//   - 쓰기(INSERT/UPDATE/DELETE) 속도 저하 (인덱스도 함께 업데이트해야 하므로)
//   - 디스크 공간 추가 사용
//   → 자주 조회하는 컬럼에만 인덱스를 걸어야 합니다!
//
// EXPLAIN ANALYZE (PostgreSQL):
//   쿼리의 "실행 계획"을 보여주는 분석 도구
//   - Seq Scan: 전체 테이블 스캔 (느림)
//   - Index Scan: 인덱스 사용 (빠름)
//   - actual time: 실제 실행 시간 (ms)
//   - rows: 스캔한 행 수
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { Order } from '../../ch02-catalog/typeorm/entities/order.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class Ch04TypeormService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ── Part 1~2: 가격 범위 검색 + EXPLAIN ANALYZE ──
  // idx_product_price 인덱스가 사용되어 가격 범위 검색이 빨라집니다
  async searchByPriceRange(minPrice: number, maxPrice: number) {
    const start = Date.now();
    const products = await this.productRepo
      .createQueryBuilder('p')
      .where('p.price BETWEEN :min AND :max', { min: minPrice, max: maxPrice })
      .orderBy('p.price', 'ASC')
      .limit(20)
      .getMany();

    return {
      _meta: { elapsedMs: Date.now() - start, count: products.length },
      data: products,
    };
  }

  // EXPLAIN ANALYZE — 실행 계획 분석
  // Index Scan이 보이면 인덱스가 잘 작동하는 것입니다
  async explainPriceSearch(minPrice: number, maxPrice: number) {
    const result = await this.dataSource.query(
      `EXPLAIN ANALYZE SELECT * FROM products WHERE price BETWEEN $1 AND $2 ORDER BY price LIMIT 20`,
      [minPrice, maxPrice],
    );
    // result: [{ "QUERY PLAN": "Index Scan using idx_product_price..." }]
    return {
      note: 'Index Scan이 보이면 인덱스가 사용된 것입니다. Seq Scan이면 전체 스캔입니다.',
      plan: result,
    };
  }

  // ── 복합 필터 (날짜 + 상태) ──
  // idx_order_created_status 복합 인덱스가 사용됩니다
  async filterOrders(from: string, to: string, status: string) {
    const start = Date.now();
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('o.status = :status', { status })
      .orderBy('o.createdAt', 'DESC')
      .limit(20)
      .getMany();

    return { _meta: { elapsedMs: Date.now() - start }, data: orders };
  }

  // ── Part 3: Query Builder 고급 — 서브쿼리 ──
  // "평균 가격 이상인 상품만 조회" — 서브쿼리로 평균을 먼저 계산
  async findAboveAveragePrice() {
    return this.productRepo
      .createQueryBuilder('p')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('AVG(p2.price)')
          .from(Product, 'p2')
          .getQuery();
        return `p.price >= ${subQuery}`;
      })
      .orderBy('p.price', 'DESC')
      .limit(20)
      .getMany();
  }

  // ── 커서 기반 페이지네이션 ──
  // OFFSET 방식의 문제: 페이지가 뒤로 갈수록 느려짐
  //   OFFSET 10000 → 앞의 10000행을 읽고 버림!
  // 커서 방식: 마지막으로 본 ID 이후부터 조회 → 항상 일정한 속도
  async findProductsByCursor(cursor: number | undefined, limit: number) {
    const qb = this.productRepo.createQueryBuilder('p');

    if (cursor) {
      qb.where('p.id > :cursor', { cursor });
    }

    const products = await qb.orderBy('p.id', 'ASC').take(limit).getMany();
    const nextCursor = products.length > 0 ? products[products.length - 1].id : null;

    return { data: products, nextCursor };
  }

  // ── Part 4: 풀텍스트 검색 (PostgreSQL) ──
  // ILIKE를 사용한 패턴 매칭 검색 (대소문자 무시)
  async fulltextSearch(query: string) {
    return this.dataSource.query(
      `SELECT id, name, price
       FROM products
       WHERE name ILIKE $1 OR description ILIKE $1
       ORDER BY name LIMIT 20`,
      [`%${query}%`],
    );
  }

  // ── Part 5: 캐싱 ──
  // 동일한 쿼리를 반복 실행하지 않고, 캐시에 저장된 결과를 재사용
  // TTL(Time To Live): 캐시 유효 시간 (60초)
  async findProductsCached() {
    const cacheKey = 'ch04:products:top20';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return { _meta: { source: 'cache' }, data: cached };
    }

    const products = await this.productRepo.find({
      order: { price: 'DESC' },
      take: 20,
    });

    // TTL 60초 동안 캐시에 저장
    await this.cacheManager.set(cacheKey, products, 60000);
    return { _meta: { source: 'database' }, data: products };
  }
}
