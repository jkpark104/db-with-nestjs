import { Store } from './domain';
import { createSeed } from './seed';

let _store: Store | null = null;

export function initStore(size: 'basic' | 'medium' = 'basic'): Store {
  _store = createSeed(size);
  return _store;
}

export function getStore(): Store {
  if (!_store) {
    _store = createSeed('basic');
  }
  return _store;
}
