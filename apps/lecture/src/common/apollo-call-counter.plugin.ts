import { Plugin } from '@nestjs/apollo';
import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { CallCounter } from '@app/mock-data';

@Plugin()
export class ApolloCallCounterPlugin implements ApolloServerPlugin {
  async requestDidStart(
    _requestContext: GraphQLRequestContext<object>,
  ): Promise<GraphQLRequestListener<object>> {
    // 요청 시작 시 새 카운터를 현재 async 체인에 주입.
    // 이후 실행되는 모든 resolver + willSendResponse가 같은 counter를 공유한다.
    const counter = CallCounter.enterWith();

    return {
      async willSendResponse(ctx) {
        // enterWith로 주입된 counter를 직접 사용 (current()도 동일)
        ctx.response.http?.headers.set('x-mock-db-calls', counter.toHeader());
      },
    };
  }
}
