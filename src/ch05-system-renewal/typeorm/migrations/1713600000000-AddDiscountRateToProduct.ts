// ============================================================
// 마이그레이션 — Product에 discountRate 컬럼 추가
// ============================================================
// 마이그레이션이란?
//   DB 스키마(테이블 구조)를 "버전 관리"하는 방법입니다.
//   git이 코드의 변경 이력을 관리하듯, 마이그레이션은 DB 구조의 변경 이력을 관리합니다.
//
// up(): 변경을 적용 (앞으로)
// down(): 변경을 되돌림 (롤백)
//
// 프로덕션에서는 synchronize: true 대신 반드시 마이그레이션을 사용하세요!
//   synchronize: true의 위험성:
//   - 컬럼 이름을 변경하면 기존 컬럼을 DROP 후 새로 CREATE → 데이터 유실!
//   - 타입 변경 시 예상치 못한 데이터 변환 발생 가능
//
// 마이그레이션 전략:
//   빅뱅: 한 번에 전체 변경. 다운타임 필수. 소규모 시스템에 적합.
//   트리클(점진적): 조금씩 변경. 이전/새 시스템 병행. 중규모 시스템.
//   제로 다운타임: expand-contract 패턴. 대규모 시스템.
//     1단계(expand): 새 컬럼 추가 (기존 컬럼 유지)
//     2단계: 코드에서 새 컬럼 사용 시작
//     3단계(contract): 기존 컬럼 제거
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscountRateToProduct1713600000000 implements MigrationInterface {
  // ── 적용 (앞으로) ──
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 새 컬럼 추가 (nullable로 먼저 추가 → 기존 데이터 깨지지 않음)
    await queryRunner.query(`
      ALTER TABLE products ADD COLUMN "discountRate" DECIMAL(5,2) DEFAULT 0
    `);

    // 2. 기존 데이터에 기본값 적용 (데이터 마이그레이션)
    await queryRunner.query(`
      UPDATE products SET "discountRate" = 0 WHERE "discountRate" IS NULL
    `);
  }

  // ── 롤백 (되돌리기) ──
  // 항상 롤백 계획을 먼저 세워라!
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN "discountRate"`);
  }
}
