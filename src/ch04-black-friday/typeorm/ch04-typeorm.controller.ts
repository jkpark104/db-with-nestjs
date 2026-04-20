// ============================================================
// Ch04TypeormController — 블랙프라이데이 인덱스 & 최적화 API (PostgreSQL)
// ============================================================
// 이 컨트롤러에서 다루는 주제:
//   - 가격 범위 검색 (인덱스 활용)
//   - EXPLAIN ANALYZE (실행 계획 분석)
//   - 서브쿼리 (평균 이상 검색)
//   - 커서 기반 페이지네이션
//   - 풀텍스트 검색
//   - 캐싱 (cache-manager)
// ============================================================

import { Controller, Get, Query } from '@nestjs/common';
import { Ch04TypeormService } from './ch04-typeorm.service';

@Controller('ch04/typeorm')
export class Ch04TypeormController {
  constructor(private readonly service: Ch04TypeormService) {}

  // GET /ch04/typeorm/products/search?minPrice=1000&maxPrice=5000
  // 가격 범위로 상품 검색 (인덱스 사용)
  @Get('products/search')
  search(
    @Query('minPrice') minPrice: string,
    @Query('maxPrice') maxPrice: string,
  ) {
    return this.service.searchByPriceRange(
      Number(minPrice) || 0,
      Number(maxPrice) || 999999,
    );
  }

  // GET /ch04/typeorm/products/explain?minPrice=1000&maxPrice=5000
  // EXPLAIN ANALYZE로 실행 계획 확인
  @Get('products/explain')
  explain(
    @Query('minPrice') minPrice: string,
    @Query('maxPrice') maxPrice: string,
  ) {
    return this.service.explainPriceSearch(
      Number(minPrice) || 0,
      Number(maxPrice) || 999999,
    );
  }

  // GET /ch04/typeorm/orders/filter?from=2024-01-01&to=2024-12-31&status=PAID
  // 복합 인덱스를 사용한 날짜+상태 필터링
  @Get('orders/filter')
  filterOrders(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('status') status: string,
  ) {
    return this.service.filterOrders(from, to, status || 'PAID');
  }

  // GET /ch04/typeorm/products/above-average
  // 서브쿼리: 평균 가격 이상 상품 조회
  @Get('products/above-average')
  aboveAverage() {
    return this.service.findAboveAveragePrice();
  }

  // GET /ch04/typeorm/products/cursor?cursor=100&limit=20
  // 커서 기반 페이지네이션 (OFFSET보다 빠름)
  @Get('products/cursor')
  cursor(@Query('cursor') cursor: string, @Query('limit') limit: string) {
    return this.service.findProductsByCursor(
      cursor ? Number(cursor) : undefined,
      Number(limit) || 20,
    );
  }

  // GET /ch04/typeorm/products/fulltext?q=키워드
  // 풀텍스트 검색 (ILIKE 패턴 매칭)
  @Get('products/fulltext')
  fulltext(@Query('q') q: string) {
    return this.service.fulltextSearch(q || '');
  }

  // GET /ch04/typeorm/products/cached
  // 캐시된 상품 목록 (TTL 60초)
  @Get('products/cached')
  cached() {
    return this.service.findProductsCached();
  }
}
