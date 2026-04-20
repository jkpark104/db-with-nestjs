// ============================================================
// Ch06PrismaController — 매출 분석, 트랜잭션, JSON API (MySQL)
// ============================================================
// TypeORM 버전과 동일한 기능을 Prisma + MySQL로 구현합니다.
// 경로: /ch06/prisma/...
// ============================================================

import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Ch06PrismaService } from './ch06-prisma.service';

@Controller('ch06/prisma')
export class Ch06PrismaController {
  constructor(private readonly service: Ch06PrismaService) {}

  // GET /ch06/prisma/analytics/monthly-revenue — 월별 매출
  @Get('analytics/monthly-revenue')
  monthlyRevenue() {
    return this.service.getMonthlyRevenue();
  }

  // GET /ch06/prisma/analytics/top-products — TOP 10 상품
  @Get('analytics/top-products')
  topProducts() {
    return this.service.getTopProducts();
  }

  // GET /ch06/prisma/analytics/category-ranking — 카테고리 랭킹
  @Get('analytics/category-ranking')
  categoryRanking() {
    return this.service.getCategoryRanking();
  }

  // POST /ch06/prisma/orders/checkout — 트랜잭션 결제
  @Post('orders/checkout')
  checkout(@Body() body: { userId: number; items: { productId: number; quantity: number }[] }) {
    return this.service.checkout(body.userId, body.items);
  }

  // POST /ch06/prisma/orders/concurrent-checkout — 비관적 락 결제
  @Post('orders/concurrent-checkout')
  concurrentCheckout(@Body() body: { userId: number; productId: number; quantity: number }) {
    return this.service.checkoutWithLock(body.userId, body.productId, body.quantity);
  }

  // GET /ch06/prisma/analytics/monthly-proc?year=2024&month=3
  // 저장 프로시저로 월별 매출 조회
  @Get('analytics/monthly-proc')
  monthlyProc(@Query('year') y: string, @Query('month') m: string) {
    return this.service.callMonthlyRevenueProc(Number(y), Number(m));
  }

  // GET /ch06/prisma/products/by-metadata?key=color&value=red
  // MySQL JSON 검색
  @Get('products/by-metadata')
  byMetadata(@Query('key') key: string, @Query('value') value: string) {
    return this.service.searchByMetadata(key, value);
  }
}
