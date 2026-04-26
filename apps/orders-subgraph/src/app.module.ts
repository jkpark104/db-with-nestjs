import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { OrderItemResolver, OrderResolver } from './order.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'apps/orders-subgraph/src/schema.gql'),
      },
      playground: false,
      introspection: true,
    }),
  ],
  providers: [OrderResolver, OrderItemResolver],
})
export class AppModule {}
