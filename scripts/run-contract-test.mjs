import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const r = spawnSync(
  process.execPath,
  ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', '--config', 'jest.contract.config.ts'],
  { stdio: 'inherit', env: { ...process.env } },
);
const status = r.status === 0 ? 'ok' : 'violation';
writeFileSync('.contract-status.json', JSON.stringify({ status, ranAt: new Date().toISOString() }, null, 2));
process.exit(r.status ?? 0);
