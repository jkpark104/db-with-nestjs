// ============================================================
// Ch04Module — "블랙프라이데이" 챕터 모듈
// ============================================================
// 이 챕터에서 학습하는 내용:
//   - 인덱스(B-Tree, Fulltext) 생성과 효과
//   - EXPLAIN ANALYZE로 실행 계획 분석
//   - 서브쿼리, 커서 기반 페이지네이션
//   - 캐싱 (cache-manager)
//
// CacheModule.register():
//   NestJS의 내장 캐시 모듈을 등록합니다.
//   기본적으로 메모리 캐시를 사용하며, Redis 등으로 교체할 수 있습니다.
// ============================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Product } from '../ch01-shop-open/typeorm/entities/product.entity';
import { Order } from '../ch02-catalog/typeorm/entities/order.entity';
import { Ch04TypeormService } from './typeorm/ch04-typeorm.service';
import { Ch04TypeormController } from './typeorm/ch04-typeorm.controller';
import { Ch04PrismaService } from './prisma/ch04-prisma.service';
import { Ch04PrismaController } from './prisma/ch04-prisma.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order]),
    CacheModule.register({ ttl: 60000 }), // 기본 TTL 60초
  ],
  controllers: [Ch04TypeormController, Ch04PrismaController],
  providers: [Ch04TypeormService, Ch04PrismaService],
})
export class Ch04Module {}
