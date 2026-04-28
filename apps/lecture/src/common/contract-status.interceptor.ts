import {
  CallHandler, ExecutionContext, Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
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
  constructor(private readonly modulesContainer: ModulesContainer) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const controllerClass = ctx.getClass();
    const { base, runtimeOn, compatOn } = this.resolveTokens(controllerClass);

    const res = ctx.switchToHttp().getResponse<{
      setHeader?: (n: string, v: string) => void;
    } | null>();

    return next.handle().pipe(
      tap(() => {
        if (!res?.setHeader || !base) return;
        const parts = [base];
        if (runtimeOn) parts.push(`runtime-validated=${readJsonStatus('.contract-status.json')}`);
        if (compatOn)  parts.push(`compat=${readJsonStatus('.compat-status.json')}`);
        res.setHeader('x-contract-status', parts.join('; '));
      }),
    );
  }

  private resolveTokens(controller: unknown): {
    base: string | null;
    runtimeOn: boolean;
    compatOn: boolean;
  } {
    for (const [, mod] of this.modulesContainer) {
      const hasController = [...mod.controllers.values()].some(
        (c) => c.metatype === controller,
      );
      if (!hasController) continue;

      const get = <T>(token: string): T | null => {
        const p = mod.providers.get(token);
        return (p?.instance as T) ?? null;
      };

      return {
        base: get<string>(CONTRACT_STATUS),
        runtimeOn: get<boolean>(CONTRACT_RUNTIME_VALIDATION) === true,
        compatOn: get<boolean>(CONTRACT_COMPAT_TRACKING) === true,
      };
    }
    return { base: null, runtimeOn: false, compatOn: false };
  }
}
