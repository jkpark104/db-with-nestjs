// scripts/gen-types.mjs
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const yaml = 'contracts/openapi.yaml';
if (!existsSync(yaml)) {
  console.log(`[gen:types] ${yaml} 없음 — skip (Ch01~Ch03 단계로 간주)`);
  process.exit(0);
}
const r = spawnSync(
  'npx',
  ['openapi-typescript', yaml, '-o', 'contracts/generated/be-types.ts'],
  { stdio: 'inherit' },
);
process.exit(r.status ?? 0);
