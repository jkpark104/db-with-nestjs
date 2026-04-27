// scripts/run-oasdiff.mjs
import { existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const baseline = 'contracts/openapi.baseline.yaml';
const current  = 'contracts/openapi.yaml';

if (!existsSync(baseline) || !existsSync(current)) {
  console.log('[test:compat] baseline 또는 current yaml 없음 — skip');
  process.exit(0);
}

const r = spawnSync(
  'npx',
  ['--yes', 'oasdiff', 'breaking', baseline, current, '--fail-on', 'ERR'],
  { stdio: 'inherit' },
);

const status = r.status === 0 ? 'stable' : 'breaking';
writeFileSync(
  '.compat-status.json',
  JSON.stringify({ status, ranAt: new Date().toISOString() }, null, 2),
);
process.exit(r.status ?? 0);
