// ============================================================
// Ch06Module — "매출 분석" 챕터 모듈
// ============================================================
// 이 챕터에서 학습하는 내용:
//   - 집계 함수 (SUM, COUNT, AVG, GROUP BY)
//   - 윈도우 함수 (RANK, PARTITION BY)
//   - 트랜잭션 (ACID, 롤백)
//   - 동시성 제어 (비관적 락, FOR UPDATE)
//   - 저장 프로시저 (PG FUNCTION, MySQL PROCEDURE)
//   - JSON/JSONB 검색 (PG ->>, MySQL JSON_EXTRACT)
// ============================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../ch02-catalog/typeorm/entities/order.entity';
import { OrderItem } from '../ch02-catalog/typeorm/entities/order-item.entity';
import { Product } from '../ch01-shop-open/typeorm/entities/product.entity';
import { Ch06TypeormService } from './typeorm/ch06-typeorm.service';
import { Ch06TypeormController } from './typeorm/ch06-typeorm.controller';
import { Ch06PrismaService } from './prisma/ch06-prisma.service';
import { Ch06PrismaController } from './prisma/ch06-prisma.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product])],
  controllers: [Ch06TypeormController, Ch06PrismaController],
  providers: [Ch06TypeormService, Ch06PrismaService],
})
export class Ch06Module {}
