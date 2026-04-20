// ============================================================
// seed.ts -- 시드 스크립트 진입점
// ============================================================
// 사용법:
//   pnpm seed:basic   → 소량 데이터 (Ch01~02 학습용)
//   pnpm seed:bulk    → 대량 데이터 (Ch03~06 성능 테스트용)
// ============================================================

import { seedBasic } from './seed-basic';
import { seedBulk } from './seed-bulk';

const mode = process.argv[2] || 'basic';

async function main() {
  if (mode === 'basic') {
    await seedBasic();
  } else if (mode === 'bulk') {
    await seedBulk();
  } else {
    console.error('Usage: ts-node seed.ts [basic|bulk]');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
