import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<CallCounter>();

export class CallCounter {
  private counts: Record<string, number> = {};

  static run<T>(fn: () => T): T {
    return storage.run(new CallCounter(), fn);
  }

  static current(): CallCounter | undefined {
    return storage.getStore();
  }

  // Apollo 플러그인처럼 함수 경계 밖에서 컨텍스트를 시작할 때 사용.
  // 현재 async 체인 전체에 새 카운터를 주입한다.
  static enterWith(): CallCounter {
    const counter = new CallCounter();
    storage.enterWith(counter);
    return counter;
  }

  increment(entityName: string): void {
    this.counts[entityName] = (this.counts[entityName] ?? 0) + 1;
  }

  total(): number {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }

  toHeader(): string {
    const parts = Object.entries(this.counts).map(([k, v]) => `${k}=${v}`);
    parts.push(`total=${this.total()}`);
    return parts.join(', ');
  }
}
