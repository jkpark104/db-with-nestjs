// ============================================================
// Ch05TypeormService — 마이그레이션 상태 조회 (PostgreSQL)
// ============================================================
// 이 서비스는 TypeORM 마이그레이션의 현재 상태를 조회합니다.
// 실제로 마이그레이션을 실행하려면 CLI 명령어를 사용합니다.
//
// TypeORM 마이그레이션 워크플로:
//   1. npx typeorm migration:generate — 엔티티 변경을 감지해 마이그레이션 생성
//   2. npx typeorm migration:run — 마이그레이션 실행
//   3. npx typeorm migration:revert — 마지막 마이그레이션 롤백
// ============================================================

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class Ch05TypeormService {
  constructor(private readonly dataSource: DataSource) {}

  // 실행된 마이그레이션 목록 조회
  // migrations 테이블이 없으면 빈 배열을 반환합니다
  async getMigrationStatus() {
    const migrations: { id: number; timestamp: number; name: string }[] =
      await this.dataSource
        .query<
          { id: number; timestamp: number; name: string }[]
        >(`SELECT * FROM migrations ORDER BY timestamp DESC`)
        .catch(() => []);

    return {
      note: '마이그레이션 = DB 스키마의 버전 관리. git처럼 변경 이력을 추적합니다.',
      commands: {
        generate:
          'npx typeorm migration:generate -d src/data-source.ts src/ch05-system-renewal/typeorm/migrations/MigrationName',
        run: 'npx typeorm migration:run -d src/data-source.ts',
        revert: 'npx typeorm migration:revert -d src/data-source.ts',
      },
      executedMigrations: migrations,
    };
  }
}
