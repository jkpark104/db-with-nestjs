// ============================================================
// Ch05PrismaService — 마이그레이션 상태 조회 (MySQL)
// ============================================================
// Prisma Migrate 워크플로:
//   1. schema.prisma 수정
//   2. pnpm prisma migrate dev --name description → SQL 파일 자동 생성 + 적용
//   3. pnpm prisma migrate deploy → 프로덕션 적용
//   4. pnpm prisma migrate status → 현재 상태 확인
//
// Prisma는 _prisma_migrations 테이블에 마이그레이션 이력을 저장합니다.
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class Ch05PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  // Prisma 마이그레이션 이력 조회
  // _prisma_migrations 테이블이 없으면 빈 배열을 반환합니다
  async getMigrationStatus() {
    const migrations = await this.prisma
      .$queryRaw`SELECT * FROM _prisma_migrations ORDER BY finished_at DESC`.catch(
      () => [],
    );

    return {
      note: 'Prisma Migrate는 schema.prisma 변경을 SQL 마이그레이션 파일로 자동 생성합니다.',
      commands: {
        dev: 'pnpm prisma migrate dev --name description',
        deploy: 'pnpm prisma migrate deploy',
        status: 'pnpm prisma migrate status',
        resolve: 'pnpm prisma migrate resolve --rolled-back migration_name',
      },
      executedMigrations: migrations,
    };
  }
}
