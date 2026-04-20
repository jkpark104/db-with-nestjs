// ============================================================
// Ch06TypeormController — 매출 분석, 트랜잭션, JSONB API (PostgreSQL)
// ============================================================
// 이 컨트롤러에서 다루는 주제:
//   - 월별 매출 집계 (GROUP BY, SUM, COUNT)
//   - 매출 TOP 10 상품 (INNER JOIN)
//   - 카테고리 내 랭킹 (윈도우 함수: RANK, PARTITION BY)
//   - 트랜잭션 (재고 차감 + 주문 생성)
//   - 비관적 락 (SELECT ... FOR UPDATE)
//   - 저장 프로시저 (PostgreSQL FUNCTION)
//   - JSONB 검색 (->> 연산자)
// ============================================================

import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Ch06TypeormService } from './ch06-typeorm.service';

@Controller('ch06/typeorm')
export class Ch06TypeormController {
  constructor(private readonly service: Ch06TypeormService) {}

  // GET /ch06/typeorm/analytics/monthly-revenue — 월별 매출 합계
  @Get('analytics/monthly-revenue')
  monthlyRevenue() {
    return this.service.getMonthlyRevenue();
  }

  // GET /ch06/typeorm/analytics/top-products — 매출 TOP 10 상품
  @Get('analytics/top-products')
  topProducts() {
    return this.service.getTopProducts();
  }

  // GET /ch06/typeorm/analytics/category-ranking — 카테고리 내 매출 랭킹
  @Get('analytics/category-ranking')
  categoryRanking() {
    return this.service.getCategoryRanking();
  }

  // POST /ch06/typeorm/orders/checkout — 트랜잭션 주문 결제
  // Body: { userId: 1, items: [{ productId: 1, quantity: 2 }] }
  @Post('orders/checkout')
  checkout(
    @Body()
    body: {
      userId: number;
      items: { productId: number; quantity: number }[];
    },
  ) {
    return this.service.checkout(body.userId, body.items);
  }

  // POST /ch06/typeorm/orders/concurrent-checkout — 비관적 락 결제
  // Body: { userId: 1, productId: 1, quantity: 2 }
  @Post('orders/concurrent-checkout')
  concurrentCheckout(
    @Body() body: { userId: number; productId: number; quantity: number },
  ) {
    return this.service.checkoutWithLock(
      body.userId,
      body.productId,
      body.quantity,
    );
  }

  // GET /ch06/typeorm/analytics/monthly-function?year=2024&month=3
  // 저장 프로시저로 월별 매출 조회
  @Get('analytics/monthly-function')
  monthlyFunction(@Query('year') year: string, @Query('month') month: string) {
    return this.service.callMonthlyRevenueFunction(Number(year), Number(month));
  }

  // GET /ch06/typeorm/products/by-metadata?key=color&value=red
  // JSONB 검색 (PostgreSQL 전용)
  @Get('products/by-metadata')
  byMetadata(@Query('key') key: string, @Query('value') value: string) {
    return this.service.searchByMetadata(key, value);
  }
}
