// ============================================================
// Ch04PrismaController — 블랙프라이데이 최적화 API (MySQL)
// ============================================================
// TypeORM 버전과 동일한 기능을 Prisma + MySQL로 구현합니다.
// 경로: /ch04/prisma/...
// ============================================================

import { Controller, Get, Query } from '@nestjs/common';
import { Ch04PrismaService } from './ch04-prisma.service';

@Controller('ch04/prisma')
export class Ch04PrismaController {
  constructor(private readonly service: Ch04PrismaService) {}

  // GET /ch04/prisma/products/search?minPrice=1000&maxPrice=5000
  @Get('products/search')
  search(@Query('minPrice') min: string, @Query('maxPrice') max: string) {
    return this.service.searchByPriceRange(Number(min) || 0, Number(max) || 999999);
  }

  // GET /ch04/prisma/products/explain?minPrice=1000&maxPrice=5000
  @Get('products/explain')
  explain(@Query('minPrice') min: string, @Query('maxPrice') max: string) {
    return this.service.explainPriceSearch(Number(min) || 0, Number(max) || 999999);
  }

  // GET /ch04/prisma/products/cursor?cursor=100&limit=20
  @Get('products/cursor')
  cursor(@Query('cursor') c: string, @Query('limit') l: string) {
    return this.service.findProductsByCursor(c ? Number(c) : undefined, Number(l) || 20);
  }

  // GET /ch04/prisma/products/fulltext?q=키워드
  @Get('products/fulltext')
  fulltext(@Query('q') q: string) {
    return this.service.fulltextSearch(q || '');
  }

  // GET /ch04/prisma/products/cached
  @Get('products/cached')
  cached() {
    return this.service.findProductsCached();
  }
}
