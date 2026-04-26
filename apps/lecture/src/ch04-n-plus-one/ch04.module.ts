import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { ApolloCallCounterPlugin } from '../common/apollo-call-counter.plugin';
import { createLoaders } from './loaders';
import {
  Ch04OrderItemResolver,
  Ch04OrderResolver,
} from './resolvers/order.resolver';
import { Ch04ProductResolver } from './resolvers/product.resolver';
import { Ch04ReviewResolver } from './resolvers/review.resolver';
import { Ch04UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/lecture/src/ch04-n-plus-one/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
      context: () => ({ loaders: createLoaders() }),
    }),
  ],
  providers: [
    Ch04UserResolver,
    Ch04ProductResolver,
    Ch04OrderResolver,
    Ch04OrderItemResolver,
    Ch04ReviewResolver,
    ApolloCallCounterPlugin,
  ],
})
export class Ch04DataLoaderModule {}
