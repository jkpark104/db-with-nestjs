import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { ApolloCallCounterPlugin } from '../common/apollo-call-counter.plugin';
import { createLoaders } from './loaders';
import {
  Ch05OrderItemResolver,
  Ch05OrderResolver,
} from './resolvers/order.resolver';
import { Ch05ProductResolver } from './resolvers/product.resolver';
import { Ch05ReviewResolver } from './resolvers/review.resolver';
import { Ch05UserResolver } from './resolvers/user.resolver';
import { pubsubProvider } from './pubsub.provider';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(
        process.cwd(),
        'apps/lecture/src/ch05-client-operations/schema.gql',
      ),
      sortSchema: true,
      playground: false,
      introspection: true,
      subscriptions: {
        'graphql-ws': true,
      },
      context: () => ({ loaders: createLoaders() }),
    }),
  ],
  providers: [
    pubsubProvider,
    Ch05UserResolver,
    Ch05ProductResolver,
    Ch05OrderResolver,
    Ch05OrderItemResolver,
    Ch05ReviewResolver,
    ApolloCallCounterPlugin,
  ],
})
export class Ch05SubscriptionModule {}
