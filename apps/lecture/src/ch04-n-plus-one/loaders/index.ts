import { createProductLoader } from './product.loader';
import { createUserLoader } from './user.loader';

export interface AppLoaders {
  user: ReturnType<typeof createUserLoader>;
  product: ReturnType<typeof createProductLoader>;
}

export interface AppContext {
  loaders: AppLoaders;
}

// GraphQL 요청마다 호출되어 격리된 캐시/배치를 보장한다.
export function createLoaders(): AppLoaders {
  return {
    user: createUserLoader(),
    product: createProductLoader(),
  };
}
