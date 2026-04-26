import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { ApolloCallCounterPlugin } from '../common/apollo-call-counter.plugin';
import {
  Ch03OrderItemResolver,
  Ch03OrderResolver,
  Ch03ReviewResolver,
} from './resolvers/order.resolver';
import { Ch03ProductResolver } from './resolvers/product.resolver';
import { Ch03UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/lecture/src/ch03-data-graph/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
    }),
  ],
  providers: [
    Ch03UserResolver,
    Ch03ProductResolver,
    Ch03OrderResolver,
    Ch03OrderItemResolver,
    Ch03ReviewResolver,
    ApolloCallCounterPlugin,
  ],
})
export class Ch03DataGraphModule {}
