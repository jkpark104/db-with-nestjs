// ============================================================
// Ch05Module — "시스템 리뉴얼" 챕터 모듈
// ============================================================
// 이 챕터에서 학습하는 내용:
//   - 마이그레이션이란 무엇인가 (DB 스키마 버전 관리)
//   - TypeORM 마이그레이션 작성법 (up/down 메서드)
//   - Prisma Migrate 워크플로
//   - 마이그레이션 전략 (빅뱅, 트리클, 제로 다운타임)
//   - synchronize: true의 위험성
// ============================================================

import { Module } from '@nestjs/common';
import { Ch05TypeormService } from './typeorm/ch05-typeorm.service';
import { Ch05PrismaService } from './prisma/ch05-prisma.service';
import { Ch05Controller } from './prisma/ch05-prisma.controller';

@Module({
  controllers: [Ch05Controller],
  providers: [Ch05TypeormService, Ch05PrismaService],
})
export class Ch05Module {}
