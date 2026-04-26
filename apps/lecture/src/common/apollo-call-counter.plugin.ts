import { Plugin } from '@nestjs/apollo';
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from '@apollo/server';
import { CallCounter } from '@app/mock-data';

@Plugin()
export class ApolloCallCounterPlugin implements ApolloServerPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener<object>> {
    const counter = new CallCounter();
    void counter;
    return {
      async willSendResponse(ctx) {
        const current = CallCounter.current();
        if (current) {
          ctx.response.http?.headers.set('x-mock-db-calls', current.toHeader());
        }
      },
    };
  }
}
