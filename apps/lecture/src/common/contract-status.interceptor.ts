import {
  CallHandler, ExecutionContext, Inject, Injectable,
  NestInterceptor, Optional,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { existsSync, readFileSync, statSync } from 'node:fs';

export const CONTRACT_STATUS = 'CONTRACT_STATUS';
export const CONTRACT_RUNTIME_VALIDATION = 'CONTRACT_RUNTIME_VALIDATION';
export const CONTRACT_COMPAT_TRACKING = 'CONTRACT_COMPAT_TRACKING';

const STALE_MS = 5 * 60 * 1000;

function readJsonStatus(path: string): string {
  if (!existsSync(path)) return 'unknown';
  try {
    const stat = statSync(path);
    if (Date.now() - stat.mtimeMs > STALE_MS) return 'stale';
    const json = JSON.parse(readFileSync(path, 'utf8'));
    return typeof json.status === 'string' ? json.status : 'unknown';
  } catch {
    return 'unknown';
  }
}

@Injectable()
export class ContractStatusInterceptor implements NestInterceptor {
  constructor(
    @Optional() @Inject(CONTRACT_STATUS) private readonly base: string | null,
    @Optional() @Inject(CONTRACT_RUNTIME_VALIDATION) private readonly runtimeOn: boolean | null,
    @Optional() @Inject(CONTRACT_COMPAT_TRACKING) private readonly compatOn: boolean | null,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = ctx.switchToHttp().getResponse<{
      setHeader?: (n: string, v: string) => void;
    } | null>();
    return next.handle().pipe(
      tap(() => {
        if (!res?.setHeader || !this.base) return;
        const parts = [this.base];
        if (this.runtimeOn) parts.push(`runtime-validated=${readJsonStatus('.contract-status.json')}`);
        if (this.compatOn)  parts.push(`compat=${readJsonStatus('.compat-status.json')}`);
        res.setHeader('x-contract-status', parts.join('; '));
      }),
    );
  }
}
