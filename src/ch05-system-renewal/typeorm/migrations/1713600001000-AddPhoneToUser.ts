// ============================================================
// 마이그레이션 — User에 phone 컬럼 추가
// ============================================================
// 두 번째 마이그레이션 예시입니다.
// 파일명의 숫자(1713600001000)는 타임스탬프로, 마이그레이션 실행 순서를 결정합니다.
// 숫자가 작을수록 먼저 실행됩니다.
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneToUser1713600001000 implements MigrationInterface {
  // ── 적용: phone 컬럼 추가 ──
  // NULL 허용으로 추가하면 기존 데이터에 영향 없음
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL
    `);
  }

  // ── 롤백: phone 컬럼 제거 ──
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN phone`);
  }
}
