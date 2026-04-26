import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { ApolloCallCounterPlugin } from '../common/apollo-call-counter.plugin';
import { Ch02OrderResolver } from './resolvers/order.resolver';
import { Ch02ProductResolver } from './resolvers/product.resolver';
import { Ch02UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/lecture/src/ch02-graphql-basics/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
    }),
  ],
  providers: [
    Ch02UserResolver,
    Ch02ProductResolver,
    Ch02OrderResolver,
    ApolloCallCounterPlugin,
  ],
})
export class Ch02GraphQLModule {}
