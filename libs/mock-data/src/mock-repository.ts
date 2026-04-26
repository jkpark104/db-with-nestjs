import { CallCounter } from './call-counter';

const LATENCY_MS = 5;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class MockRepository<T extends { id: number }> {
  constructor(
    private readonly entityName: string,
    private readonly getAll: () => T[],
  ) {}

  async findOne(id: number): Promise<T | undefined> {
    CallCounter.current()?.increment(this.entityName);
    await sleep(LATENCY_MS);
    return this.getAll().find((e) => e.id === id);
  }

  async findMany(filter?: (e: T) => boolean): Promise<T[]> {
    CallCounter.current()?.increment(this.entityName);
    await sleep(LATENCY_MS);
    const all = this.getAll();
    return filter ? all.filter(filter) : [...all];
  }

  async findByIds(ids: readonly number[]): Promise<(T | undefined)[]> {
    CallCounter.current()?.increment(this.entityName);
    await sleep(LATENCY_MS);
    const map = new Map<number, T>();
    for (const e of this.getAll()) map.set(e.id, e);
    return ids.map((id) => map.get(id));
  }
}
